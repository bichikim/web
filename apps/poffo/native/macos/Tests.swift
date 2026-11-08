import XCTest
import AppKit
import WebKit
import Metal

final class NativeUITests: XCTestCase {
    @MainActor
    func testNativeWindowLifecycle() async throws {
        continueAfterFailure = false
        let environment = ProcessInfo.processInfo.environment
        let path = try XCTUnwrap(environment["POFFO_NATIVE_APP"])
        let workspace = try XCTUnwrap(environment["POFFO_NATIVE_WORKSPACE"])
        let output = try XCTUnwrap(environment["POFFO_NATIVE_OUTPUT"])
        let control = try XCTUnwrap(environment["POFFO_NATIVE_CONTROL"])
        try await probeGraphics(output)
        let app = XCUIApplication(url: URL(fileURLWithPath: path))
        defer { if app.state != .notRunning { app.terminate() } }

        launch(app, workspace: workspace, parts: 0)
        attach(app, "main-window", output)
        try await checkpoint(control, "launched")
        openMenu(app, "불러오기")
        XCTAssertTrue(app.sheets["open-panel"].buttons["Open"].waitForExistence(timeout: 30))
        attach(app, "native-open-dialog", output)
        app.sheets["open-panel"].buttons["CancelButton"].click()
        XCTAssertTrue(app.sheets["open-panel"].buttons["Open"].waitForNonExistence(timeout: 30))
        try await checkpoint(control, "open-cancelled")

        openMenu(app, "불러오기")
        XCTAssertTrue(app.sheets["open-panel"].buttons["Open"].waitForExistence(timeout: 30))
        goTo(app, URL(fileURLWithPath: workspace).appendingPathComponent("source.json").path)
        attach(app, "selected-open-file", output)
        app.sheets["open-panel"].buttons["Open"].click()
        XCTAssertTrue(app.sheets["open-panel"].waitForNonExistence(timeout: 30))
        attach(app, "after-native-open", output)
        let loaded = named(app, "파츠 122개").waitForExistence(timeout: 60)
        attach(app, "loaded-or-failed", output)
        guard loaded else { throw NativeFailure("Character did not load after native open") }
        try await checkpoint(control, "opened")
        try await checkpoint(control, "edited")
        try validateFrame(output)
        XCTAssertTrue(named(app, "CLI 검증 모션 추가").waitForExistence(timeout: 30))
        attach(app, "character-window", output)
        if environment["POFFO_NATIVE_GPU_ONLY"] == "true" { return }

        openMenu(app, "문서 저장")
        try waitForSavePanel(app, output)
        attach(app, "native-save-cancel", output)
        savePanel(app).buttons["CancelButton"].click()
        waitForSave(app)
        try await checkpoint(control, "save-cancelled")

        let exitPanel = app.sheets.containing(.button, identifier: "변경 사항을 남기고 종료").firstMatch
        let confirmation = exitPanel.buttons["변경 사항을 남기고 종료"]
        if environment["POFFO_NATIVE_TRACE"] != "true" {
            app.typeKey("w", modifierFlags: [.command])
            XCTAssertTrue(confirmation.waitForExistence(timeout: 30))
            XCTAssertTrue(exitPanel.exists)
            attach(app, "native-close-cancel", output)
            exitPanel.buttons["취소"].click()
            XCTAssertTrue(confirmation.waitForNonExistence(timeout: 30))
            try await checkpoint(control, "close-cancelled")
        }

        openMenu(app, "문서 저장")
        try waitForSavePanel(app, output)
        goTo(app, workspace)
        let name = savePanel(app).textFields["saveAsNameTextField"]
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        paste("캐릭터 저장.poffo", into: name)
        attach(app, "native-save-complete", output)
        savePanel(app).buttons["Save"].click()
        waitForSave(app)
        try await checkpoint(control, "saved")
        if environment["POFFO_NATIVE_TRACE"] == "true" { return }
        closeClean(app)
        try await checkpoint(control, "clean-closed")

        let saved = URL(fileURLWithPath: workspace).appendingPathComponent("캐릭터 저장.poffo").path
        launch(app, workspace: workspace, file: saved, parts: 122)
        try await checkpoint(control, "reopened")
        closeClean(app)
        try await checkpoint(control, "reopened-closed")

        launch(app, workspace: workspace, file: saved, parts: 122)
        try await checkpoint(control, "edited-again")
        app.typeKey("q", modifierFlags: [.command])
        XCTAssertTrue(confirmation.waitForExistence(timeout: 30))
        attach(app, "native-close-confirm", output)
        confirmation.click()
        XCTAssertTrue(app.wait(for: .notRunning, timeout: 60))
        try await checkpoint(control, "discarded")

        launch(app, workspace: workspace, parts: 122)
        attach(app, "recovered-window", output)
        try await checkpoint(control, "recovered")
        closeClean(app)
        try await checkpoint(control, "recovered-closed")

        try await checkpoint(control, "attached-start")
        launch(app, workspace: workspace + " attached", parts: 122)
        attach(app, "attached-window", output)
        closeClean(app)
        try await checkpoint(control, "attached-closed")
    }

    @MainActor
    private func attach(_ app: XCUIApplication, _ name: String, _ output: String) {
        let screenshot = app.screenshot()
        try? screenshot.pngRepresentation.write(to: URL(fileURLWithPath: output).appendingPathComponent(name + ".png"))
        try? app.debugDescription.write(toFile: output + "/" + name + ".txt", atomically: true, encoding: .utf8)
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    private func named(_ app: XCUIApplication, _ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
    }

    @MainActor
    private func launch(_ app: XCUIApplication, workspace: String, file: String? = nil, parts: Int) {
        app.launchArguments = ["--workspace", workspace] + (file.map { ["--file", $0] } ?? [])
        app.launch()
        XCTAssertTrue(named(app, "파츠 \(parts)개").waitForExistence(timeout: 60))
    }

    @MainActor
    private func openMenu(_ app: XCUIApplication, _ action: String) {
        app.menuBars.menuBarItems["파일"].click()
        app.menuItems[action].click()
    }

    @MainActor
    private func paste(_ value: String, into element: XCUIElement) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(value, forType: .string)
        element.click()
        element.typeKey("a", modifierFlags: [.command])
        element.typeKey("v", modifierFlags: [.command])
    }

    @MainActor
    private func goTo(_ app: XCUIApplication, _ path: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(path, forType: .string)
        app.typeKey("g", modifierFlags: [.command, .shift])
        app.typeKey("v", modifierFlags: [.command])
        app.typeKey("\r", modifierFlags: [])
    }

    @MainActor
    private func savePanel(_ app: XCUIApplication) -> XCUIElement {
        app.sheets.containing(.button, identifier: "Save").firstMatch
    }

    @MainActor
    private func waitForSavePanel(_ app: XCUIApplication, _ output: String) throws {
        guard savePanel(app).buttons["Save"].waitForExistence(timeout: 60) else {
            attach(app, "save-panel-not-ready", output)
            throw NativeFailure("Native save panel did not appear before its deadline")
        }
    }

    @MainActor
    private func waitForSave(_ app: XCUIApplication) {
        XCTAssertTrue(savePanel(app).buttons["Save"].waitForNonExistence(timeout: 30))
        XCTAssertTrue(named(app, "저장하는 중…").waitForNonExistence(timeout: 60))
        XCTAssertTrue(named(app, "CLI 검증 모션 추가").waitForExistence(timeout: 30))
    }

    @MainActor
    private func closeClean(_ app: XCUIApplication) {
        app.typeKey("w", modifierFlags: [.command])
        XCTAssertTrue(app.wait(for: .notRunning, timeout: 60))
    }

    private func checkpoint(_ control: String, _ name: String) async throws {
        var request = URLRequest(url: URL(string: control + "/checkpoint")!)
        request.httpMethod = "POST"
        if ProcessInfo.processInfo.environment["POFFO_NATIVE_TRACE"] == "true" {
            request.timeoutInterval = 120
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["name": name])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw NativeFailure(String(data: data, encoding: .utf8) ?? "Checkpoint request failed")
        }
    }

    private func validateFrame(_ output: String) throws {
        let path = URL(fileURLWithPath: output).appendingPathComponent("native-frame.png")
        if !FileManager.default.fileExists(atPath: path.path) {
            let probe = try JSONSerialization.jsonObject(with: Data(contentsOf:
                URL(fileURLWithPath: output).appendingPathComponent("graphics.json"))) as? [String: Any]
            let renderer = probe?["pixiProbe"] as? [String: Any]
            guard renderer?["available"] as? Bool == false else { throw NativeFailure("Missing native frame") }
            return
        }
        let data = try Data(contentsOf: path)
        let bitmap = try XCTUnwrap(NSBitmapImageRep(data: data))
        var occupied = 0
        for row in 0..<20 {
            for column in 0..<20 {
                let color = bitmap.colorAt(x: column * bitmap.pixelsWide / 20, y: row * bitmap.pixelsHigh / 20)
                if (color?.alphaComponent ?? 0) > 0 { occupied += 1 }
            }
        }
        XCTAssertGreaterThan(occupied, 10)
    }

    @MainActor
    private func probeGraphics(_ output: String) async throws {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(OriginPage(), forURLScheme: "tauri")
        let browser = WKWebView(frame: NSRect(x: 0, y: 0, width: 640, height: 640), configuration: configuration)
        let window = NSWindow(contentRect: browser.frame, styleMask: [.titled], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.title = "WebKit graphics control"
        window.contentView = browser
        window.orderFrontRegardless()
        defer { window.close() }
        let ready = expectation(description: "Independent WebKit canvas loaded")
        let navigation = ProbeNavigation(ready)
        browser.navigationDelegate = navigation
        browser.load(URLRequest(url: URL(string: "tauri://localhost/")!))
        await fulfillment(of: [ready], timeout: 30)
        let evaluated = try await browser.evaluateJavaScript("""
          JSON.stringify({
            webgl2: !!document.createElement('canvas').getContext('webgl2'),
            webgl: !!document.createElement('canvas').getContext('webgl'),
            origin: location.origin,
            secureContext: isSecureContext,
            subtle: typeof crypto.subtle,
            randomUUID: typeof crypto.randomUUID,
            visibility: document.visibilityState,
            pixiProbe: (() => {
              try {
                const context = document.createElement('canvas').getContext('webgl', {
                  stencil: true, failIfMajorPerformanceCaveat: false
                });
                if (!context) return {available: false};
                const extension = context.getExtension('WEBGL_debug_renderer_info');
                return {
                  available: !!context.getContextAttributes()?.stencil,
                  attributes: context.getContextAttributes(),
                  renderer: extension ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
                  lost: context.isContextLost(),
                  globalType: typeof WebGLRenderingContext
                };
              } catch (error) { return {available: false, error: String(error)}; }
            })(),
            pixiWebgl2Probe: (() => {
              try {
                const context = document.createElement('canvas').getContext('webgl2', {
                  stencil: true, failIfMajorPerformanceCaveat: false
                });
                if (!context) return {available: false};
                return {
                  available: !!context.getContextAttributes()?.stencil,
                  attributes: context.getContextAttributes(),
                  lost: context.isContextLost(),
                  error: context.getError()
                };
              } catch (error) { return {available: false, error: String(error)}; }
            })(),
            userAgent: navigator.userAgent
          })
          """)
        let value = try XCTUnwrap(evaluated as? String)
        var result = try XCTUnwrap(try JSONSerialization.jsonObject(with: Data(value.utf8)) as? [String: Any])
        result["metalDevices"] = MTLCopyAllDevices().map { $0.name }
        result["nativeWindowVisible"] = window.isVisible
        try XCUIScreen.main.screenshot().pngRepresentation.write(to: URL(fileURLWithPath: output).appendingPathComponent("graphics-control.png"))
        let destination = URL(fileURLWithPath: output).appendingPathComponent("graphics.json")
        try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]).write(to: destination)
    }
}

private final class ProbeNavigation: NSObject, WKNavigationDelegate {
    private let ready: XCTestExpectation
    init(_ ready: XCTestExpectation) { self.ready = ready }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { ready.fulfill() }
}

private final class OriginPage: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        let data = Data("<!doctype html><title>Native origin control</title>".utf8)
        task.didReceive(URLResponse(url: task.request.url!, mimeType: "text/html", expectedContentLength: data.count, textEncodingName: "utf-8"))
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

private struct NativeFailure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}
