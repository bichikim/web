using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Automation;
using System.Windows.Forms;

public static class NativeProbe {
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr handle);
    private static readonly AutoResetEvent Changed = new AutoResetEvent(false);

    private static AutomationElement Wait(AutomationElement root, Condition condition) {
        var deadline = DateTime.UtcNow.AddSeconds(45);
        while (true) {
            var element = root.FindFirst(TreeScope.Descendants, condition);
            if (element != null) return element;
            var remaining = deadline - DateTime.UtcNow;
            if (remaining <= TimeSpan.Zero) throw new Exception("UI element unavailable: " + condition);
            Changed.WaitOne(remaining);
        }
    }

    private static Condition Named(ControlType type, string name) {
        return new AndCondition(new PropertyCondition(AutomationElement.ControlTypeProperty, type),
            new PropertyCondition(AutomationElement.NameProperty, name));
    }

    private static void Screenshot(AutomationElement window, string path) {
        var bounds = window.Current.BoundingRectangle;
        using (var bitmap = new Bitmap((int)bounds.Width, (int)bounds.Height)) {
            using (var graphics = Graphics.FromImage(bitmap)) {
                graphics.CopyFromScreen((int)bounds.X, (int)bounds.Y, 0, 0, bitmap.Size);
            }
            bitmap.Save(path, ImageFormat.Png);
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

    public static void Run(string executable, string workspace, string output) {
        StructureChangedEventHandler changed = (sender, args) => Changed.Set();
        AutomationEventHandler opened = (sender, args) => Changed.Set();
        var desktop = AutomationElement.RootElement;
        Automation.AddStructureChangedEventHandler(desktop, TreeScope.Subtree, changed);
        Automation.AddAutomationEventHandler(WindowPattern.WindowOpenedEvent, desktop, TreeScope.Subtree, opened);
        var process = Process.Start(new ProcessStartInfo(executable, "--workspace \"" + workspace + "\"") { UseShellExecute = false });
        var session = process.SessionId;
        AutomationElement window = null;
        var stage = "native-window";
        try {
            window = Wait(desktop, new AndCondition(new PropertyCondition(AutomationElement.ProcessIdProperty, process.Id),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Window)));
            stage = "editor-ready";
            Wait(window, new PropertyCondition(AutomationElement.NameProperty, "파츠 0개"));
            Wait(window, Named(ControlType.MenuItem, "파일"));
            File.WriteAllText(Path.Combine(output, "main-tree.txt"), Dump(window));
            Screenshot(window, Path.Combine(output, "main-window.png"));
            SetForegroundWindow(new IntPtr(window.Current.NativeWindowHandle));
            SendKeys.SendWait("^o");
            stage = "native-open-dialog";
            var dialog = Wait(desktop, new AndCondition(new PropertyCondition(AutomationElement.ProcessIdProperty, process.Id),
                new PropertyCondition(AutomationElement.ClassNameProperty, "#32770")));
            File.WriteAllText(Path.Combine(output, "open-tree.txt"), Dump(dialog));
            Screenshot(dialog, Path.Combine(output, "native-open-dialog.png"));
            var cancel = Wait(dialog, new PropertyCondition(AutomationElement.AutomationIdProperty, "2"));
            ((InvokePattern)cancel.GetCurrentPattern(InvokePattern.Pattern)).Invoke();
            ((WindowPattern)window.GetCurrentPattern(WindowPattern.Pattern)).Close();
            if (!process.WaitForExit(30000)) throw new Exception("Native app did not exit after cancelling open");
            File.WriteAllText(Path.Combine(output, "smoke.json"), "{\"nativeOpenCancelled\":true,\"cleanExit\":true,\"sessionId\":" + session + "}");
        } catch (Exception error) {
            File.WriteAllText(Path.Combine(output, "failure.txt"), stage + "\n" + error.ToString());
            if (window != null) {
                File.WriteAllText(Path.Combine(output, "failure-tree.txt"), Dump(window));
                Screenshot(window, Path.Combine(output, "failure-window.png"));
            }
            throw;
        } finally {
            if (!process.HasExited) process.Kill();
            Automation.RemoveAllEventHandlers();
        }
    }
}
