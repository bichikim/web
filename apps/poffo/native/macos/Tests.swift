import XCTest
import AppKit

final class NativeUITests: XCTestCase {
    @MainActor
    func testNativeWindowLifecycle() async throws {
        continueAfterFailure = false
        let environment = ProcessInfo.processInfo.environment
        let path = try XCTUnwrap(environment["POFFO_NATIVE_APP"])
        let workspace = try XCTUnwrap(environment["POFFO_NATIVE_WORKSPACE"])
        let output = try XCTUnwrap(environment["POFFO_NATIVE_OUTPUT"])
        let control = try XCTUnwrap(environment["POFFO_NATIVE_CONTROL"])
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
        app.sheets["open-panel"].buttons["Open"].click()
        XCTAssertTrue(named(app, "파츠 122개").waitForExistence(timeout: 60))
        try await checkpoint(control, "opened")
        try await checkpoint(control, "edited")
        XCTAssertTrue(named(app, "CLI 검증 모션 추가").waitForExistence(timeout: 30))
        attach(app, "character-window", output)

        openMenu(app, "문서 저장")
        XCTAssertTrue(savePanel(app).buttons["Save"].waitForExistence(timeout: 60))
        attach(app, "native-save-cancel", output)
        savePanel(app).buttons["CancelButton"].click()
        waitForSave(app)
        try await checkpoint(control, "save-cancelled")

        app.typeKey("w", modifierFlags: [.command])
        let exitPanel = app.sheets.containing(.button, identifier: "변경 사항을 남기고 종료").firstMatch
        let confirmation = exitPanel.buttons["변경 사항을 남기고 종료"]
        XCTAssertTrue(confirmation.waitForExistence(timeout: 30))
        XCTAssertTrue(app.sheets.containing(.button, identifier: "변경 사항을 남기고 종료").firstMatch.exists)
        attach(app, "native-close-cancel", output)
        exitPanel.buttons["취소"].click()
        XCTAssertTrue(confirmation.waitForNonExistence(timeout: 30))
        try await checkpoint(control, "close-cancelled")

        openMenu(app, "문서 저장")
        XCTAssertTrue(savePanel(app).buttons["Save"].waitForExistence(timeout: 60))
        goTo(app, workspace)
        let name = savePanel(app).textFields["Save As:"]
        XCTAssertTrue(name.waitForExistence(timeout: 10))
        paste("캐릭터 저장.poffo", into: name)
        attach(app, "native-save-complete", output)
        savePanel(app).buttons["Save"].click()
        waitForSave(app)
        try await checkpoint(control, "saved")
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
    private func waitForSave(_ app: XCUIApplication) {
        XCTAssertTrue(savePanel(app).buttons["Save"].waitForNonExistence(timeout: 30))
        XCTAssertTrue(named(app, "저장하는 중…").waitForNonExistence(timeout: 60))
    }

    @MainActor
    private func closeClean(_ app: XCUIApplication) {
        app.typeKey("w", modifierFlags: [.command])
        XCTAssertTrue(app.wait(for: .notRunning, timeout: 60))
    }

    private func checkpoint(_ control: String, _ name: String) async throws {
        var request = URLRequest(url: URL(string: control + "/checkpoint")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["name": name])
        let (data, response) = try await URLSession.shared.data(for: request)
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200, String(data: data, encoding: .utf8) ?? "")
    }
}
