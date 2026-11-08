using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Automation;

public sealed class NativeDriver : IDisposable {
    [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr handle, uint command);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr handle);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr handle);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] private static extern void mouse_event(uint flags, uint x, uint y, uint data, UIntPtr extra);
    private const uint Owner = 4;
    private readonly AutoResetEvent changed = new AutoResetEvent(false);
    private readonly string executable;
    private readonly string output;
    private readonly string control;
    private Process process;
    private AutomationElement window;
    private string stage = "launch";
    private Exception actionError;
    private readonly object signalLock = new object();
    private bool disposed;
    private AutomationElement activeMenu;
    private readonly List<Thread> actions = new List<Thread>();

    private void SignalChanged() {
        lock (signalLock) { if (!disposed) changed.Set(); }
    }

    private void Begin(Action action) {
        var worker = new Thread(() => {
            try { action(); }
            catch (Exception error) { Interlocked.CompareExchange(ref actionError, error, null); }
            finally { SignalChanged(); }
        }) {IsBackground = true};
        worker.SetApartmentState(ApartmentState.MTA);
        actions.Add(worker);
        worker.Start();
    }

    private NativeDriver(string executable, string output, string control) {
        this.executable = executable;
        this.output = output;
        this.control = control;
        var desktop = AutomationElement.RootElement;
        Automation.AddStructureChangedEventHandler(desktop, TreeScope.Subtree, (sender, args) => SignalChanged());
        Automation.AddAutomationEventHandler(WindowPattern.WindowOpenedEvent, desktop, TreeScope.Subtree, (sender, args) => SignalChanged());
        Automation.AddAutomationEventHandler(WindowPattern.WindowClosedEvent, desktop, TreeScope.Subtree, (sender, args) => SignalChanged());
        Automation.AddAutomationFocusChangedEventHandler((sender, args) => SignalChanged());
        Automation.AddAutomationEventHandler(AutomationElement.MenuOpenedEvent, desktop, TreeScope.Subtree, (sender, args) => {
            activeMenu = sender as AutomationElement;
            SignalChanged();
        });
        Automation.AddAutomationPropertyChangedEventHandler(desktop, TreeScope.Subtree, (sender, args) => SignalChanged(),
            AutomationElement.NameProperty, AutomationElement.IsEnabledProperty);
    }

    private void Until(Func<bool> ready, string description) {
        var deadline = DateTime.UtcNow.AddSeconds(60);
        while (!ready()) {
            if (actionError != null) throw new Exception("Native UI action failed: " + stage, actionError);
            var remaining = deadline - DateTime.UtcNow;
            if (remaining <= TimeSpan.Zero) throw new Exception("UI condition unavailable: " + description);
            changed.WaitOne(remaining);
        }
    }

    private AutomationElement Find(AutomationElement root, Condition condition, string description, TreeScope scope = TreeScope.Descendants) {
        AutomationElement result = null;
        Until(() => { result = root.FindFirst(scope, condition); return result != null; }, description);
        return result;
    }

    private static Condition Named(string name) {
        return new PropertyCondition(AutomationElement.NameProperty, name);
    }

    private void Launch(string workspace, string file, int parts) {
        stage = "launch";
        var arguments = "--workspace \"" + workspace + "\"";
        if (file != null) arguments += " --file \"" + file + "\"";
        process = Process.Start(new ProcessStartInfo(executable, arguments) {UseShellExecute = false});
        window = Find(AutomationElement.RootElement,
            new AndCondition(new PropertyCondition(AutomationElement.ProcessIdProperty, process.Id),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Window)), "native window", TreeScope.Children);
        stage = "editor-ready";
        Find(window, Named("파츠 " + parts + "개"), "loaded editor");
    }

    private static void Invoke(AutomationElement element) {
        ((InvokePattern)element.GetCurrentPattern(InvokePattern.Pattern)).Invoke();
    }

    private AutomationElement Dialog() {
        stage = "native-dialog";
        AutomationElement result = null;
        var main = new IntPtr(window.Current.NativeWindowHandle);
        Until(() => {
            foreach (var root in new[] {window, AutomationElement.RootElement}) {
                foreach (AutomationElement candidate in root.FindAll(TreeScope.Children,
                    new PropertyCondition(AutomationElement.ClassNameProperty, "#32770"))) {
                    if (GetWindow(new IntPtr(candidate.Current.NativeWindowHandle), Owner) == main ||
                        candidate.Current.ProcessId == process.Id) { result = candidate; return true; }
                }
            }
            return false;
        }, "owned Win32 dialog");
        return result;
    }

    private AutomationElement FileMenu(string action) {
        stage = action;
        var handle = new IntPtr(window.Current.NativeWindowHandle);
        SetForegroundWindow(handle);
        Until(() => GetForegroundWindow() == handle, "editor foreground");
        var file = Find(window, new AndCondition(Named("파일"),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.MenuItem)), "File menu");
        activeMenu = null;
        var point = file.GetClickablePoint();
        if (!SetCursorPos((int)point.X, (int)point.Y)) throw new Exception("Could not position pointer on File menu");
        mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
        mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
        Until(() => activeMenu != null, "native File menu opened");
        Capture(activeMenu, "native-menu");
        var item = Find(activeMenu, new AndCondition(Named(action),
            new PropertyCondition(AutomationElement.IsEnabledProperty, true),
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.MenuItem)), action);
        Begin(() => Invoke(item));
        return Dialog();
    }

    private void Dismiss(AutomationElement dialog, string name, bool identifier) {
        var handle = new IntPtr(dialog.Current.NativeWindowHandle);
        var condition = identifier
            ? new PropertyCondition(AutomationElement.AutomationIdProperty, name)
            : Named(name);
        var button = Find(dialog, new AndCondition(condition,
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button),
            new PropertyCondition(AutomationElement.IsEnabledProperty, true)), name);
        Begin(() => Invoke(button));
        Until(() => !IsWindowVisible(handle), "dialog closed");
    }

    private void Filename(AutomationElement dialog, string path) {
        var name = Find(dialog, new AndCondition(
            new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit),
            new OrCondition(Named("File name:"), new PropertyCondition(AutomationElement.AutomationIdProperty, "1148"))), "file name");
        Exception failure = null;
        var clipboard = new Thread(() => {
            try { System.Windows.Forms.Clipboard.SetText(path); }
            catch (Exception error) { failure = error; }
        });
        clipboard.SetApartmentState(ApartmentState.STA);
        clipboard.Start();
        clipboard.Join();
        if (failure != null) throw new Exception("Could not prepare native path input", failure);
        name.SetFocus();
        System.Windows.Forms.SendKeys.SendWait("^a");
        System.Windows.Forms.SendKeys.SendWait("^v");
        System.Windows.Forms.SendKeys.SendWait("{TAB}");
    }

    private void WaitForSave() {
        Until(() => window.FindFirst(TreeScope.Descendants, Named("저장하는 중…")) == null, "save acknowledgement completed");
        Find(window, new AndCondition(Named("CLI 검증 모션 추가"),
            new PropertyCondition(AutomationElement.IsEnabledProperty, true)), "editor restored after native save");
    }

    private void CloseWindow() {
        stage = "window-close";
        Begin(() => ((WindowPattern)window.GetCurrentPattern(WindowPattern.Pattern)).Close());
    }

    private void WaitForExit() {
        if (!process.WaitForExit(60000)) throw new Exception("Native application did not exit");
    }

    private void Checkpoint(string name) {
        stage = name;
        using (var client = new WebClient()) {
            client.Encoding = Encoding.UTF8;
            client.Headers[HttpRequestHeader.ContentType] = "application/json";
            client.UploadString(control + "/checkpoint", "POST", "{\"name\":\"" + name + "\"}");
        }
    }

    private void ValidateFrame() {
        using (var bitmap = new Bitmap(Path.Combine(output, "native-frame.png"))) {
            int occupied = 0;
            for (int row = 0; row < 20; row++) {
                for (int column = 0; column < 20; column++) {
                    if (bitmap.GetPixel(column * bitmap.Width / 20, row * bitmap.Height / 20).A > 0) occupied++;
                }
            }
            if (occupied <= 10) throw new Exception("Native renderer returned a blank frame");
        }
    }

    private static string Dump(AutomationElement root) {
        var text = new StringBuilder();
        foreach (AutomationElement item in root.FindAll(TreeScope.Descendants, Condition.TrueCondition)) {
            try { text.AppendLine(item.Current.ControlType.ProgrammaticName + " | " + item.Current.AutomationId + " | " + item.Current.Name); }
            catch (ElementNotAvailableException) { }
        }
        return text.ToString();
    }

    private void Capture(AutomationElement element, string name) {
        var bounds = element.Current.BoundingRectangle;
        using (var bitmap = new Bitmap((int)bounds.Width, (int)bounds.Height)) {
            using (var graphics = Graphics.FromImage(bitmap)) {
                graphics.CopyFromScreen((int)bounds.X, (int)bounds.Y, 0, 0, bitmap.Size);
            }
            bitmap.Save(Path.Combine(output, name + ".png"), ImageFormat.Png);
        }
        File.WriteAllText(Path.Combine(output, name + ".txt"), Dump(element));
    }

    private void Exercise(string workspace) {
        Launch(workspace, null, 0);
        Capture(window, "main-window");
        Checkpoint("launched");
        var dialog = FileMenu("불러오기");
        Capture(dialog, "native-open-dialog");
        Dismiss(dialog, "2", true);
        Checkpoint("open-cancelled");

        dialog = FileMenu("불러오기");
        Filename(dialog, Path.Combine(workspace, "source.json"));
        Dismiss(dialog, "1", true);
        Find(window, Named("파츠 122개"), "real character loaded");
        Checkpoint("opened");
        Checkpoint("edited");
        ValidateFrame();
        Find(window, Named("CLI 검증 모션 추가"), "CLI edit projected to native webview");
        Capture(window, "character-window");

        dialog = FileMenu("문서 저장");
        Capture(dialog, "native-save-cancel");
        Dismiss(dialog, "2", true);
        WaitForSave();
        Checkpoint("save-cancelled");
        CloseWindow();
        dialog = Dialog();
        if (GetWindow(new IntPtr(dialog.Current.NativeWindowHandle), Owner) != new IntPtr(window.Current.NativeWindowHandle))
            throw new Exception("Exit confirmation is not owned by the editor window");
        Capture(dialog, "native-close-cancel");
        Dismiss(dialog, "취소", false);
        Checkpoint("close-cancelled");

        var saved = Path.Combine(workspace, "캐릭터 저장.poffo");
        dialog = FileMenu("문서 저장");
        Filename(dialog, saved);
        Capture(dialog, "native-save-complete");
        Dismiss(dialog, "1", true);
        WaitForSave();
        Checkpoint("saved");
        CloseWindow();
        WaitForExit();
        Checkpoint("clean-closed");

        Launch(workspace, saved, 122);
        Checkpoint("reopened");
        CloseWindow();
        WaitForExit();
        Checkpoint("reopened-closed");

        Launch(workspace, saved, 122);
        Checkpoint("edited-again");
        CloseWindow();
        dialog = Dialog();
        Capture(dialog, "native-close-confirm");
        Dismiss(dialog, "변경 사항을 남기고 종료", false);
        WaitForExit();
        Checkpoint("discarded");
        Launch(workspace, null, 122);
        Capture(window, "recovered-window");
        Checkpoint("recovered");
        CloseWindow();
        WaitForExit();
        Checkpoint("recovered-closed");

        Checkpoint("attached-start");
        Launch(workspace + " attached", null, 122);
        Capture(window, "attached-window");
        CloseWindow();
        WaitForExit();
        Checkpoint("attached-closed");
    }

    public static void Run(string executable, string workspace, string output, string control) {
        Exception failure = null;
        var worker = new Thread(() => {
            try { RunOnWorker(executable, workspace, output, control); }
            catch (Exception error) { failure = error; }
        });
        worker.SetApartmentState(ApartmentState.MTA);
        worker.Start();
        worker.Join();
        if (failure != null) throw new Exception("Native UI validation failed", failure);
    }

    private static void RunOnWorker(string executable, string workspace, string output, string control) {
        using (var driver = new NativeDriver(executable, output, control)) {
            try { driver.Exercise(workspace); }
            catch (Exception error) {
                File.WriteAllText(Path.Combine(output, "failure.txt"), driver.stage + "\n" + error.ToString());
                if (driver.process != null && driver.process.HasExited)
                    File.AppendAllText(Path.Combine(output, "failure.txt"), "\nNative process exit code: " + driver.process.ExitCode);
                if (driver.window != null && !driver.process.HasExited) driver.Capture(driver.window, "failure-window");
                throw;
            }
        }
    }

    public void Dispose() {
        if (process != null && !process.HasExited) process.Kill();
        Console.WriteLine("Native driver cleanup: waiting for modal actions");
        foreach (var action in actions) {
            if (!action.Join(TimeSpan.FromSeconds(30))) throw new TimeoutException("Native UI action did not finish before cleanup");
        }
        Console.WriteLine("Native driver cleanup: removing event handlers");
        Automation.RemoveAllEventHandlers();
        lock (signalLock) { disposed = true; changed.Dispose(); }
        Console.WriteLine("Native driver cleanup: complete");
    }
}
