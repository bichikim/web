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

private final class GraphicsProbe: NSObject, WKNavigationDelegate, NSApplicationDelegate, WKScriptMessageHandler {
    let output: URL
    var browser: WKWebView!
    var window: NSWindow!
    var result: [String: Any] = ["probeOnly": true]
    init(output: URL) { self.output = output }

    func applicationDidFinishLaunching(_ notification: Notification) {
        result["metal"] = renderMetal()
        result["os"] = ProcessInfo.processInfo.operatingSystemVersionString
        try? FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted,.sortedKeys]).write(to: output)
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(OriginPage(), forURLScheme: "tauri")
        configuration.userContentController.add(self, name: "graphics")
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
          (() => {
            const contexts=[];
            let finished=false;
            const finish=reason=>{
              if(finished)return;
              finished=true;
              window.webkit.messageHandlers.graphics.postMessage({reason,visibility:document.visibilityState,contexts});
            };
            const inspect=(type,attached)=>{
              const canvas=document.createElement('canvas');
              canvas.width=8;canvas.height=8;
              if(attached)document.body.append(canvas);
              const result={type,attached,events:[]};
              contexts.push(result);
              canvas.addEventListener('webglcontextcreationerror',event=>result.events.push({kind:event.type,message:event.statusMessage}));
              canvas.addEventListener('webglcontextlost',event=>{
                event.preventDefault();result.events.push({kind:event.type,message:event.statusMessage});
              });
              let gl;
              const read=()=>{
                if(!gl)return;
                result.attributes=gl.getContextAttributes();result.lost=gl.isContextLost();
                result.error=gl.getError();result.available=!!result.attributes?.stencil;
                if(result.available){
                  gl.clearColor(0,1,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
                  const pixels=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
                  result.firstPixel=Array.from(pixels);
                }
              };
              canvas.addEventListener('webglcontextrestored',event=>{
                result.events.push({kind:event.type});read();
                const attachedContexts=contexts.filter(entry=>entry.attached);
                if(attachedContexts.length===2&&attachedContexts.every(entry=>entry.available))finish('restored');
              });
              try{gl=canvas.getContext(type,{stencil:true});read();}
              catch(error){result.error=String(error);result.available=false;}
            };
            inspect('webgl',false);inspect('webgl2',false);
            AbortSignal.timeout(15000).addEventListener('abort',()=>finish('deadline'),{once:true});
            requestAnimationFrame(()=>{
              inspect('webgl',true);inspect('webgl2',true);
              if(contexts.filter(entry=>entry.attached).every(entry=>entry.available))finish('first-frame');
            });
          })()
          """
        webView.evaluateJavaScript(script) { _, error in
            if let error {
                self.result["webKitError"] = error.localizedDescription
                self.finish()
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        result["webKit"] = message.body
        finish()
    }

    private func finish() {
        result["windowVisible"] = window.isVisible
        result["applicationActive"] = NSApplication.shared.isActive
        do {
            try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted,.sortedKeys]).write(to: output)
        } catch { fputs("Graphics evidence write failed: \(error)\n", stderr) }
        NSApplication.shared.terminate(nil)
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
