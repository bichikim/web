import AppKit
import WebKit
import Metal
import CryptoKit

private func renderMetal() -> [String: Any] {
    let devices = MTLCopyAllDevices()
    var result: [String: Any] = ["devices": devices.map { $0.name }, "available": false]
    guard let device = MTLCreateSystemDefaultDevice() else {
        result["error"] = "No default Metal device"
        return result
    }
    result["device"] = device.name
    result["unifiedMemory"] = device.hasUnifiedMemory
    result["mac2"] = device.supportsFamily(.mac2)
    do {
        let source = """
          #include <metal_stdlib>
          using namespace metal;
          vertex float4 vertexMain(uint id [[vertex_id]]) {
            float2 positions[3] = {float2(-1,-1), float2(3,-1), float2(-1,3)};
            return float4(positions[id], 0, 1);
          }
          fragment float4 fragmentMain() { return float4(0,1,0,1); }
          """
        let library = try device.makeLibrary(source: source, options: nil)
        let descriptor = MTLRenderPipelineDescriptor()
        descriptor.vertexFunction = library.makeFunction(name: "vertexMain")
        descriptor.fragmentFunction = library.makeFunction(name: "fragmentMain")
        descriptor.colorAttachments[0].pixelFormat = .rgba8Unorm
        let pipeline = try device.makeRenderPipelineState(descriptor: descriptor)
        let textureDescriptor = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba8Unorm, width: 8, height: 8, mipmapped: false)
        textureDescriptor.storageMode = device.hasUnifiedMemory ? .shared : .managed
        textureDescriptor.usage = [.renderTarget, .shaderRead]
        guard let texture = device.makeTexture(descriptor: textureDescriptor),
              let queue = device.makeCommandQueue(),
              let command = queue.makeCommandBuffer() else {
            result["error"] = "Metal resources unavailable"
            return result
        }
        let pass = MTLRenderPassDescriptor()
        pass.colorAttachments[0].texture = texture
        pass.colorAttachments[0].loadAction = .clear
        pass.colorAttachments[0].storeAction = .store
        guard let encoder = command.makeRenderCommandEncoder(descriptor: pass) else {
            result["error"] = "Metal render encoder unavailable"
            return result
        }
        encoder.setRenderPipelineState(pipeline)
        encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
        encoder.endEncoding()
        if !device.hasUnifiedMemory, let blit = command.makeBlitCommandEncoder() {
            blit.synchronize(resource: texture)
            blit.endEncoding()
        }
        let completed = DispatchSemaphore(value: 0)
        command.addCompletedHandler { _ in completed.signal() }
        command.commit()
        guard completed.wait(timeout: .now() + 30) == .success else {
            result["error"] = "Metal command completion timed out"
            return result
        }
        result["commandStatus"] = command.status.rawValue
        if let error = command.error { result["commandError"] = error.localizedDescription }
        var pixels = [UInt8](repeating: 0, count: 8 * 8 * 4)
        pixels.withUnsafeMutableBytes { bytes in
            texture.getBytes(bytes.baseAddress!, bytesPerRow: 8 * 4, from: MTLRegionMake2D(0, 0, 8, 8), mipmapLevel: 0)
        }
        let expected: [UInt8] = (0..<(8 * 8)).flatMap { _ -> [UInt8] in [0, 255, 0, 255] }
        result["available"] = command.status == .completed && pixels == expected
        result["pixelHash"] = SHA256.hash(data: Data(pixels)).map { String(format: "%02x", $0) }.joined()
        result["firstPixel"] = Array(pixels.prefix(4))
    } catch {
        result["error"] = error.localizedDescription
    }
    return result
}

private final class GraphicsProbe: NSObject, WKNavigationDelegate, NSApplicationDelegate {
    let output: URL
    var browser: WKWebView!
    var window: NSWindow!
    var result: [String: Any] = ["probeOnly": true]
    init(output: URL) { self.output = output }

    func applicationDidFinishLaunching(_ notification: Notification) {
        result["metal"] = renderMetal()
        result["os"] = ProcessInfo.processInfo.operatingSystemVersionString
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(OriginPage(), forURLScheme: "tauri")
        browser = WKWebView(frame: NSRect(x: 0, y: 0, width: 640, height: 640), configuration: configuration)
        browser.navigationDelegate = self
        window = NSWindow(contentRect: browser.frame, styleMask: [.titled], backing: .buffered, defer: false)
        window.title = "Poffo native graphics control"
        window.contentView = browser
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate()
        browser.load(URLRequest(url: URL(string: "tauri://localhost/")!))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let script = """
          JSON.stringify({visibility:document.visibilityState, contexts:['webgl','webgl2'].map(type=>{
            try {
              const gl=document.createElement('canvas').getContext(type,{stencil:true});
              if(!gl)return {type,available:false};
              const attributes=gl.getContextAttributes();
              return {type,attributes,lost:gl.isContextLost(),error:gl.getError(),available:!!attributes?.stencil};
            }catch(error){return {type,error:String(error),available:false};}
          })})
          """
        webView.evaluateJavaScript(script) { value, error in
            if let value = value as? String, let data = value.data(using: .utf8) {
                self.result["webKit"] = try? JSONSerialization.jsonObject(with: data)
            }
            if let error { self.result["webKitError"] = error.localizedDescription }
            self.result["windowVisible"] = self.window.isVisible
            self.result["applicationActive"] = NSApplication.shared.isActive
            do {
                try FileManager.default.createDirectory(at: self.output.deletingLastPathComponent(), withIntermediateDirectories: true)
                try JSONSerialization.data(withJSONObject: self.result, options: [.prettyPrinted,.sortedKeys]).write(to: self.output)
            } catch { fputs("Graphics evidence write failed: \(error)\n", stderr) }
            NSApplication.shared.terminate(nil)
        }
    }
}

private final class OriginPage: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        let data = Data("<!doctype html><title>GPU capability control</title>".utf8)
        task.didReceive(URLResponse(url: task.request.url!, mimeType: "text/html", expectedContentLength: data.count, textEncodingName: "utf-8"))
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

let application = NSApplication.shared
application.setActivationPolicy(.regular)
private let probe = GraphicsProbe(output: URL(fileURLWithPath: CommandLine.arguments[1]))
application.delegate = probe
application.run()
