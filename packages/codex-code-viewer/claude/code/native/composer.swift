import AppKit
import ApplicationServices
import CoreServices
import Foundation

// Attachment actions require the exact viewer URL; reveal requires the exact foreground Code session.
struct ComposerFailure: Error {
    let code: String
    let detail: String
    init(code: String, detail: String = "") { self.code = code; self.detail = detail }
}

func value(_ element: AXUIElement, _ attribute: String) -> CFTypeRef? {
    var result: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, attribute as CFString, &result) == .success else { return nil }
    return result
}

func text(_ element: AXUIElement, _ attribute: String) -> String {
    if let string = value(element, attribute) as? String { return string }
    if let url = value(element, attribute) as? URL { return url.absoluteString }
    return ""
}

func descendants(_ root: AXUIElement) -> [AXUIElement] {
    var pending = [root]
    var found: [AXUIElement] = []
    while let element = pending.popLast(), found.count < 5000 {
        found.append(element)
        if let children = value(element, kAXChildrenAttribute) as? [AXUIElement] {
            pending.append(contentsOf: children.reversed())
        }
    }
    return found
}

func canonical(_ string: String) -> String {
    let url = string.hasPrefix("http") ? string : "http://" + string
    return URL(string: url)?.absoluteString ?? ""
}

struct Target {
    let process: pid_t
    let app: AXUIElement
    let window: AXUIElement
    let prompt: AXUIElement
    let composer: AXUIElement
    let session: String
}

func target(_ viewer: String, session expected: String? = nil) throws -> Target {
    guard let parsed = URLComponents(string: viewer), parsed.scheme == "http",
          parsed.host == "127.0.0.1", parsed.port != nil,
          parsed.fragment?.hasPrefix("token=") == true else {
        throw ComposerFailure(code: "composer-target-missing")
    }
    guard AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary) else {
        throw ComposerFailure(code: "composer-permission-required")
    }
    let applications = NSRunningApplication.runningApplications(withBundleIdentifier: "com.anthropic.claudefordesktop")
    guard applications.count == 1, let application = applications.first else {
        throw ComposerFailure(code: "composer-target-missing")
    }
    let app = AXUIElementCreateApplication(application.processIdentifier)
    guard let raw = value(app, kAXFocusedWindowAttribute), CFGetTypeID(raw) == AXUIElementGetTypeID() else {
        throw ComposerFailure(code: "composer-target-missing")
    }
    let window = unsafeBitCast(raw, to: AXUIElement.self)
    let elements = descendants(window)
    guard elements.contains(where: {
        text($0, kAXRoleAttribute) == "AXTextField" &&
        ["페이지 URL", "Page URL"].contains(text($0, kAXDescriptionAttribute)) &&
        canonical(text($0, kAXValueAttribute)) == viewer
    }) else { throw ComposerFailure(code: "composer-target-missing") }
    let sessions = Set(elements.map { text($0, kAXURLAttribute) }.filter {
        $0.contains("claude.ai/epitaxy/local_")
    })
    guard sessions.count == 1, let session = sessions.first, expected == nil || session == expected else {
        throw ComposerFailure(code: "composer-target-missing")
    }
    let prompts = elements.filter {
        ["AXTextArea", "AXTextField"].contains(text($0, kAXRoleAttribute)) &&
        ["프롬프트", "Prompt"].contains(text($0, kAXDescriptionAttribute))
    }
    guard prompts.count == 1, let prompt = prompts.first else {
        throw ComposerFailure(code: "composer-target-missing")
    }
    var ancestor = prompt
    var composer: AXUIElement?
    for _ in 0..<8 {
        guard let rawParent = value(ancestor, kAXParentAttribute), CFGetTypeID(rawParent) == AXUIElementGetTypeID() else { break }
        ancestor = unsafeBitCast(rawParent, to: AXUIElement.self)
        if descendants(ancestor).contains(where: {
            text($0, kAXRoleAttribute) == "AXPopUpButton" &&
            [text($0, kAXTitleAttribute), text($0, kAXDescriptionAttribute)].contains(where: { ["추가", "Add"].contains($0) })
        }), let rawParent = value(ancestor, kAXParentAttribute), CFGetTypeID(rawParent) == AXUIElementGetTypeID() {
            composer = unsafeBitCast(rawParent, to: AXUIElement.self)
            break
        }
    }
    guard let composer else { throw ComposerFailure(code: "composer-target-missing") }
    return Target(process: application.processIdentifier, app: app, window: window, prompt: prompt, composer: composer, session: session)
}

func activate(_ process: pid_t, window: AXUIElement) throws {
    if NSWorkspace.shared.frontmostApplication?.processIdentifier == process { return }
    guard let application = NSRunningApplication(processIdentifier: process) else {
        throw ComposerFailure(code: "composer-target-missing")
    }
    let notification = NSWorkspace.shared.notificationCenter.addObserver(
        forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: nil
    ) { _ in CFRunLoopStop(CFRunLoopGetCurrent()) }
    defer { NSWorkspace.shared.notificationCenter.removeObserver(notification) }
    guard application.activate(options: []) else { throw ComposerFailure(code: "composer-target-missing") }
    let deadline = ProcessInfo.processInfo.systemUptime + 2
    while NSWorkspace.shared.frontmostApplication?.processIdentifier != process {
        let remaining = deadline - ProcessInfo.processInfo.systemUptime
        guard remaining > 0 else { throw ComposerFailure(code: "composer-target-missing") }
        CFRunLoopRunInMode(.defaultMode, remaining, true)
    }
    guard AXUIElementPerformAction(window, kAXRaiseAction as CFString) == .success else {
        throw ComposerFailure(code: "composer-target-missing")
    }
}

func hasAttachment(_ window: AXUIElement, path: String) -> Bool {
    descendants(window).contains { element in
        [kAXTitleAttribute, kAXDescriptionAttribute, kAXValueAttribute].contains { attribute in
            let string = text(element, attribute)
            return string == path || string == path + " 삭제" || string == "Remove " + path
        }
    }
}

struct BrowserTarget {
    let process: pid_t
    let app: AXUIElement
    let window: AXUIElement
    let toggle: AXUIElement
}

func browserTarget(_ expected: String) throws -> BrowserTarget {
    let identifier = expected.hasPrefix("local_") ? String(expected.dropFirst(6)) : expected
    guard UUID(uuidString: identifier) != nil else {
        throw ComposerFailure(code: "composer-target-missing", detail: "invalid-session")
    }
    guard AXIsProcessTrusted() else { throw ComposerFailure(code: "composer-permission-required") }
    let applications = NSRunningApplication.runningApplications(withBundleIdentifier: "com.anthropic.claudefordesktop")
    guard applications.count == 1, let application = applications.first else {
        throw ComposerFailure(code: "composer-target-missing", detail: "Claude-required")
    }
    let app = AXUIElementCreateApplication(application.processIdentifier)
    guard let raw = value(app, kAXFocusedWindowAttribute), CFGetTypeID(raw) == AXUIElementGetTypeID() else {
        throw ComposerFailure(code: "composer-target-missing", detail: "window-missing")
    }
    let window = unsafeBitCast(raw, to: AXUIElement.self)
    let elements = descendants(window)
    let sessions = Set(elements.compactMap { element -> String? in
        let raw = text(element, kAXURLAttribute)
        guard let url = URL(string: raw), url.host == "claude.ai",
              url.path.hasPrefix("/epitaxy/local_") else { return nil }
        return url.lastPathComponent
    })
    guard sessions == ["local_" + identifier.lowercased()] else {
        throw ComposerFailure(code: "composer-target-missing", detail: "session-mismatch expected=\(identifier) visible=\(sessions.sorted().joined(separator: ","))")
    }
    let toggles = elements.filter {
        ["AXCheckBox", "AXButton"].contains(text($0, kAXRoleAttribute)) &&
        [text($0, kAXTitleAttribute), text($0, kAXDescriptionAttribute)].contains("Browser") &&
        value($0, kAXValueAttribute) is NSNumber
    }
    guard toggles.count == 1, let toggle = toggles.first else {
        throw ComposerFailure(code: "composer-target-missing", detail: "browser-toggle-missing")
    }
    return BrowserTarget(process: application.processIdentifier, app: app, window: window, toggle: toggle)
}

func revealBrowser(_ session: String, viewer: String) throws {
    guard let url = URLComponents(string: viewer), url.scheme == "http", url.host == "127.0.0.1",
          url.port != nil, url.fragment?.range(of: "^token=[a-f0-9]{64}$", options: .regularExpression) != nil else {
        throw ComposerFailure(code: "composer-target-missing", detail: "invalid-viewer")
    }
    var current = try browserTarget(session)
    try activate(current.process, window: current.window)
    current = try browserTarget(session)
    var observer: AXObserver?
    guard AXObserverCreate(current.process, { _, _, _, _ in
        CFRunLoopStop(CFRunLoopGetCurrent())
    }, &observer) == .success, let observer else {
        throw ComposerFailure(code: "composer-target-missing", detail: "observer-missing")
    }
    let source = AXObserverGetRunLoopSource(observer)
    CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .defaultMode)
    defer { CFRunLoopRemoveSource(CFRunLoopGetCurrent(), source, .defaultMode) }
    for element in [current.app, current.window] {
        for notification in [kAXLayoutChangedNotification, kAXValueChangedNotification,
                             kAXFocusedUIElementChangedNotification, kAXCreatedNotification] {
            AXObserverAddNotification(observer, element, notification as CFString, nil)
        }
    }
    if (value(current.toggle, kAXValueAttribute) as? NSNumber)?.intValue == 0 {
        guard AXUIElementPerformAction(current.toggle, kAXPressAction as CFString) == .success else {
            throw ComposerFailure(code: "composer-target-missing", detail: "browser-toggle-failed")
        }
    }
    let deadline = ProcessInfo.processInfo.systemUptime + 4
    while true {
        let live = try browserTarget(session)
        guard NSWorkspace.shared.frontmostApplication?.processIdentifier == live.process else {
            throw ComposerFailure(code: "composer-target-missing", detail: "foreground-changed")
        }
        let visible = (value(live.toggle, kAXValueAttribute) as? NSNumber)?.intValue == 1
        let matching = descendants(live.window).contains {
            text($0, kAXRoleAttribute) == "AXTextField" &&
            ["페이지 URL", "Page URL"].contains(text($0, kAXDescriptionAttribute)) &&
            canonical(text($0, kAXValueAttribute)) == viewer
        }
        if visible && matching { return }
        let remaining = deadline - ProcessInfo.processInfo.systemUptime
        guard remaining > 0 else {
            throw ComposerFailure(code: "composer-target-missing", detail: "browser-not-visible")
        }
        CFRunLoopRunInMode(.defaultMode, remaining, true)
    }
}

func legacyAttachmentFilename(_ file: URL) -> String {
    let original = file.lastPathComponent
    guard original == "code-viewer-context.txt",
          let size = try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize, size <= 65_536,
          let content = try? String(contentsOf: file, encoding: .utf8),
          !content.contains("\n\n---\n\n") else { return original }
    let lines = content.components(separatedBy: "\n")
    guard let first = lines.first else { return original }
    let codePrefix = "The user attached the selected editor text at "
    let changesPrefix = "The user attached unsaved changes to "
    let rangePrefix = "The user selected "
    let ending = " in Code Viewer."
    let path: String
    let suffix: String
    if first.hasPrefix(codePrefix), first.hasSuffix(ending), lines.count > 2,
       lines[1] == "This is a current editor snapshot and may include unsaved edits. Attaching it does not save the file." {
        let location = String(first.dropFirst(codePrefix.count).dropLast(ending.count))
        guard let range = location.range(of: #":\d+:\d+(?:-\d+:\d+)?$"#, options: .regularExpression) else { return original }
        path = String(location[..<range.lowerBound])
        suffix = ".selection.txt"
    } else if first.hasPrefix(rangePrefix), first.hasSuffix(ending), lines.count > 3, lines[1].isEmpty {
        let location = String(first.dropFirst(rangePrefix.count).dropLast(ending.count))
        guard let range = location.range(of: #":\d+:\d+(?:-\d+:\d+)?$"#, options: .regularExpression) else { return original }
        path = String(location[..<range.lowerBound])
        guard lines[2].hasPrefix(path + ":") else { return original }
        suffix = ".selection.txt"
    } else if first.hasPrefix(changesPrefix), first.hasSuffix(ending), lines.count > 3,
              lines[1].hasPrefix("Base revision (last read or saved): "),
              lines[2] == "This is a draft snapshot, not a disk save." {
        let quoted = String(first.dropFirst(changesPrefix.count).dropLast(ending.count))
        guard let data = quoted.data(using: .utf8),
              let decoded = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) as? String else { return original }
        path = decoded
        suffix = ".changes.patch"
    } else { return original }
    var name = URL(fileURLWithPath: path).lastPathComponent
    guard path.hasPrefix("/"), !name.isEmpty, name != ".", name != "..",
          !name.contains("\\"), !name.contains("\0"), !name.contains("\n"), !name.contains("\r") else { return original }
    while (name + suffix).utf8.count > 255 { name.removeLast() }
    return name + suffix
}

func attachmentSnapshot(_ path: String) throws -> URL {
    let file = URL(fileURLWithPath: path)
    let resolved = file.resolvingSymlinksInPath()
    let directory = file.deletingLastPathComponent()
    let root = directory.deletingLastPathComponent().resolvingSymlinksInPath()
    let temporary = URL(fileURLWithPath: NSTemporaryDirectory()).resolvingSymlinksInPath()
    let shared = URL(fileURLWithPath: "/tmp").resolvingSymlinksInPath()
    let shortExport = root.path == shared.path && directory.lastPathComponent.range(of: "^cv-[A-Za-z0-9]{6}$", options: .regularExpression) != nil
    // Existing viewer processes still export to the previous per-user temporary directory.
    let previousExport = root.path == temporary.path && directory.lastPathComponent.hasPrefix("code-viewer-attachment-")
    let expected = root.appendingPathComponent(directory.lastPathComponent).appendingPathComponent(file.lastPathComponent)
    let attributes = try? FileManager.default.attributesOfItem(atPath: directory.path)
    guard shortExport || previousExport,
          resolved.path == expected.path,
          (attributes?[.ownerAccountID] as? NSNumber)?.uint32Value == getuid(),
          (attributes?[.posixPermissions] as? NSNumber)?.intValue == 0o700,
          (try? resolved.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true else {
        throw ComposerFailure(code: "composer-attachment-failed")
    }
    let filename = legacyAttachmentFilename(file)
    guard previousExport || filename != file.lastPathComponent else { return file }
    var template = Array("/tmp/cv-XXXXXX".utf8CString)
    guard let created = mkdtemp(&template) else {
        throw ComposerFailure(code: "composer-attachment-failed")
    }
    let destination = URL(fileURLWithPath: String(cString: created), isDirectory: true)
    let snapshot = destination.appendingPathComponent(filename)
    do {
        try FileManager.default.copyItem(at: file, to: snapshot)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: snapshot.path)
        return snapshot
    } catch {
        try? FileManager.default.removeItem(at: destination)
        throw ComposerFailure(code: "composer-attachment-failed")
    }
}

func paste(_ viewer: String, session: String, path: String) throws {
    var current = try target(viewer, session: session)
    try activate(current.process, window: current.window)
    current = try target(viewer, session: session)
    let file = try attachmentSnapshot(path)
    let attachment = file.path
    let resolved = file.resolvingSymlinksInPath()
    let draft = text(current.prompt, kAXValueAttribute)
    var observer: AXObserver?
    let created = AXObserverCreate(current.process, { _, _, _, _ in
        CFRunLoopStop(CFRunLoopGetCurrent())
    }, &observer)
    guard created == .success, let observer else { throw ComposerFailure(code: "composer-attachment-failed") }
    let source = AXObserverGetRunLoopSource(observer)
    CFRunLoopAddSource(CFRunLoopGetCurrent(), source, .defaultMode)
    defer { CFRunLoopRemoveSource(CFRunLoopGetCurrent(), source, .defaultMode) }
    for element in [current.app, current.window, current.prompt] {
        for notification in [kAXFocusedUIElementChangedNotification, kAXValueChangedNotification,
                             kAXLayoutChangedNotification, kAXCreatedNotification] {
            AXObserverAddNotification(observer, element, notification as CFString, nil)
        }
    }
    // Re-copy only the exported snapshot, without reading clipboard content.
    let clipboard = NSPasteboard.general
    clipboard.clearContents()
    let legacy = NSPasteboard.PasteboardType("NSFilenamesPboardType")
    guard clipboard.writeObjects([file as NSURL]) else { throw ComposerFailure(code: "composer-attachment-failed") }
    clipboard.addTypes([legacy], owner: nil)
    guard clipboard.setPropertyList([attachment], forType: legacy) else { throw ComposerFailure(code: "composer-attachment-failed") }
    let clipboardVersion = clipboard.changeCount
    guard AXUIElementSetAttributeValue(current.prompt, kAXFocusedAttribute as CFString, kCFBooleanTrue) == .success else {
        throw ComposerFailure(code: "composer-target-missing", detail: "focus-request")
    }
    // Focusing Electron's editor can replace its accessible element; resolve the live prompt again.
    current = try target(viewer, session: session)
    guard let rawFocus = value(current.app, kAXFocusedUIElementAttribute), CFGetTypeID(rawFocus) == AXUIElementGetTypeID() else {
        throw ComposerFailure(code: "composer-target-missing", detail: "focused-element")
    }
    let focused = unsafeBitCast(rawFocus, to: AXUIElement.self)
    guard ["AXTextArea", "AXTextField"].contains(text(focused, kAXRoleAttribute)),
          ["프롬프트", "Prompt"].contains(text(focused, kAXDescriptionAttribute)),
          text(current.prompt, kAXValueAttribute) == draft,
          NSWorkspace.shared.frontmostApplication?.processIdentifier == current.process else {
        throw ComposerFailure(code: "composer-target-missing", detail: "focused-prompt")
    }
    guard clipboard.changeCount == clipboardVersion else {
        throw ComposerFailure(code: "composer-attachment-failed", detail: "clipboard-replaced")
    }
    guard let down = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: true),
          let up = CGEvent(keyboardEventSource: nil, virtualKey: 9, keyDown: false) else {
        throw ComposerFailure(code: "composer-attachment-failed")
    }
    down.flags = .maskCommand
    up.flags = .maskCommand
    down.postToPid(current.process)
    up.postToPid(current.process)
    let deadline = ProcessInfo.processInfo.systemUptime + 4
    while true {
        let live = try target(viewer, session: session)
        if hasAttachment(live.composer, path: attachment) || hasAttachment(live.composer, path: resolved.path) {
            guard text(live.prompt, kAXValueAttribute) == draft else {
                throw ComposerFailure(code: "composer-attachment-failed", detail: "draft-changed")
            }
            return
        }
        let remaining = deadline - ProcessInfo.processInfo.systemUptime
        guard remaining > 0 else { throw ComposerFailure(code: "composer-attachment-failed", detail: "card-missing") }
        // Accessibility notifications wake this bounded wait; elapsed time never counts as success.
        CFRunLoopRunInMode(.defaultMode, remaining, true)
    }
}

func reply(_ fields: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: fields, options: [.sortedKeys]),
       let string = String(data: data, encoding: .utf8) { print(string) }
}

do {
    // Register this installed bundle before macOS resolves its Accessibility identity.
    guard LSRegisterURL(Bundle.main.bundleURL as CFURL, true) == noErr else {
        throw ComposerFailure(code: "composer-target-missing")
    }
    let args = Array(CommandLine.arguments.dropFirst())
    if args.count == 2, args[0] == "check" {
        let current = try target(args[1])
        reply(["ok": true, "session": current.session])
    } else if args.count == 4, args[0] == "paste" {
        try paste(args[1], session: args[2], path: args[3])
        reply(["ok": true])
    } else if args.count == 3, args[0] == "reveal" {
        try revealBrowser(args[1], viewer: args[2])
        reply(["ok": true])
    } else { throw ComposerFailure(code: "composer-target-missing") }
} catch let error as ComposerFailure {
    reply(["ok": false, "code": error.code, "detail": error.detail])
    exit(1)
} catch {
    reply(["ok": false, "code": "composer-attachment-failed"])
    exit(1)
}
