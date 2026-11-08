import XCTest

final class NativeUITests: XCTestCase {
    @MainActor
    func testNativeOpenCancellation() throws {
        continueAfterFailure = false
        let environment = ProcessInfo.processInfo.environment
        let path = try XCTUnwrap(environment["POFFO_NATIVE_APP"])
        let workspace = try XCTUnwrap(environment["POFFO_NATIVE_WORKSPACE"])
        let app = XCUIApplication(url: URL(fileURLWithPath: path))
        app.launchArguments = ["--workspace", workspace]
        app.launch()
        defer { if app.state != .notRunning { app.terminate() } }
        XCTAssertTrue(app.windows.firstMatch.waitForExistence(timeout: 60))
        print(app.debugDescription)
        attach(app, "main-window")
        let file = app.menuBars.menuBarItems["파일"]
        XCTAssertTrue(file.waitForExistence(timeout: 30))
        file.click()
        app.menuItems["불러오기"].click()
        let open = app.buttons["Open"]
        XCTAssertTrue(open.waitForExistence(timeout: 30))
        attach(app, "native-open-dialog")
        print(app.debugDescription)
        app.buttons["Cancel"].click()
        XCTAssertTrue(open.waitForNonExistence(timeout: 30))
        app.typeKey("w", modifierFlags: [.command])
        XCTAssertTrue(app.wait(for: .notRunning, timeout: 30))
    }

    @MainActor
    private func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
