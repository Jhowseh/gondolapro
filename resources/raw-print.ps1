$ErrorActionPreference = 'Stop'

$source = @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class GondolaProRawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DocInfo
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string Name;
        [MarshalAs(UnmanagedType.LPWStr)] public string OutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string DataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr handle);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int StartDocPrinter(IntPtr handle, int level, [In] DocInfo info);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr handle);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr handle);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr handle);

    [DllImport("winspool.drv", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr handle, byte[] data, int count, out int written);

    public static void Send(string printer, byte[] data)
    {
        IntPtr handle;
        if (!OpenPrinter(printer, out handle, IntPtr.Zero))
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }
        try
        {
            DocInfo info = new DocInfo();
            info.Name = "GondolaPro";
            info.DataType = "RAW";
            if (StartDocPrinter(handle, 1, info) == 0)
            {
                throw new Win32Exception(Marshal.GetLastWin32Error());
            }
            try
            {
                StartPagePrinter(handle);
                int written;
                if (!WritePrinter(handle, data, data.Length, out written) || written != data.Length)
                {
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                }
                EndPagePrinter(handle);
            }
            finally
            {
                EndDocPrinter(handle);
            }
        }
        finally
        {
            ClosePrinter(handle);
        }
    }
}
"@

function Get-CacheFolder {
  $base = $env:LOCALAPPDATA
  if (-not $base) { $base = [Environment]::GetFolderPath('LocalApplicationData') }
  if (-not $base) { $base = [IO.Path]::GetTempPath() }
  Join-Path $base 'GondolaPro'
}

function Get-SourceHash {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $bytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($source))
    ([BitConverter]::ToString($bytes, 0, 8) -replace '-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Import-RawPrinter {
  $folder = Get-CacheFolder
  $assembly = Join-Path $folder ("RawPrinter-{0}.dll" -f (Get-SourceHash))

  if (Test-Path -LiteralPath $assembly) {
    try {
      Add-Type -LiteralPath $assembly
      return 'cache'
    } catch {
      Remove-Item -LiteralPath $assembly -Force -ErrorAction SilentlyContinue
    }
  }

  $temporary = "$assembly.$PID.tmp"
  try {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Add-Type -TypeDefinition $source -OutputAssembly $temporary -OutputType Library
    Move-Item -LiteralPath $temporary -Destination $assembly -Force
    Add-Type -LiteralPath $assembly
    return 'compiled'
  } catch {
    Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
  }

  Add-Type -TypeDefinition $source
  'memory'
}

function Get-ErrorMessage($record) {
  $exception = $record.Exception
  while ($exception -is [Management.Automation.MethodInvocationException] -and $exception.InnerException) {
    $exception = $exception.InnerException
  }
  $exception.Message
}

function Write-Reply([string]$line) {
  [Console]::Out.WriteLine($line)
  [Console]::Out.Flush()
}

$mode = Import-RawPrinter
Write-Reply "READY $mode"

while ($null -ne ($line = [Console]::In.ReadLine())) {
  if (-not $line.Trim()) { continue }
  try {
    $parts = $line.Split(' ')
    $printer = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parts[0]))
    $data = [Convert]::FromBase64String($parts[1])
    [GondolaProRawPrinter]::Send($printer, $data)
    Write-Reply 'OK'
  } catch {
    $message = Get-ErrorMessage $_
    Write-Reply ('ERR ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($message)))
  }
}
