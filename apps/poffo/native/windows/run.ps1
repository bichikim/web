$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, WindowsBase, System.Drawing, System.Windows.Forms
$references = @(
  [System.Windows.Automation.AutomationElement].Assembly.Location
  [System.Windows.Automation.ControlType].Assembly.Location
  [System.Windows.Rect].Assembly.Location
  [System.Drawing.Bitmap].Assembly.Location
  [System.Windows.Forms.SendKeys].Assembly.Location
  [System.Diagnostics.Process].Assembly.Location
  [System.Linq.Enumerable].Assembly.Location
)
Add-Type -Path "$PSScriptRoot/Driver.cs" -ReferencedAssemblies ($references | Select-Object -Unique)
[NativeDriver]::Run($env:POFFO_NATIVE_APP, $env:POFFO_NATIVE_WORKSPACE, $env:POFFO_NATIVE_OUTPUT, $env:POFFO_NATIVE_CONTROL)
