<#
  setup-dev.ps1 - React Native Full-Pro v3.1
  Author: ChatGPT (assistant)
  Purpose: Robust Windows setup for RN (non-Expo) projects (target RN 0.81.x)
#>

# -------- Helpers & Safety ----------
function Write-Info($msg){ Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Succ($msg){ Write-Host "[OK]    $msg" -ForegroundColor Green }

# Check admin
$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Warn "Script is not running as Administrator. Some installs may fail. Please re-run PowerShell as Administrator for full automation."
}

Write-Host "`n🔧 Starting React Native Dev Environment Setup (Full-Pro v3.1)`n" -ForegroundColor Magenta

# -----------------------
# 1) Install Chocolatey if missing
# -----------------------
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Info "Chocolatey not found. Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    try {
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Succ "Chocolatey installed."
    } catch {
        Write-Err "Chocolatey install failed: $_"
        Write-Warn "You can install Chocolatey manually: https://community.chocolatey.org/install"
    }
} else {
    Write-Succ "Chocolatey detected."
}

# -----------------------
# Utility: safe choco install (only if missing)
# -----------------------
function Install-ChocolateyPackage($pkg) {
    if (-not (choco list --local-only | Select-String "^$pkg\s")) {
        Write-Info "Installing $pkg via Chocolatey..."
        choco install -y $pkg --no-progress
        if ($LASTEXITCODE -eq 0) { Write-Succ "$pkg installed." } else { Write-Warn "choco may have failed installing $pkg (exit $LASTEXITCODE)." }
    } else {
        Write-Succ "$pkg already installed (choco)."
    }
}

# -----------------------
# 2) Ensure Java (JDK 17)
# -----------------------
Write-Info "Checking Java version..."
$javaOK = $false
try {
    $javaVersionRaw = & java -version 2>&1
    if ($javaVersionRaw) {
        $verLine = $javaVersionRaw[0]
        Write-Info "java -version: $verLine"
        if ($verLine -match 'version\s+"?(\d+)\.') {
            $major = [int]$matches[1]
            if ($major -eq 17) {
                Write-Succ "Detected Java 17."
                $javaOK = $true
            } else {
                Write-Warn "Detected Java major version $major (need 17)."
            }
        }
    }
} catch {
    Write-Warn "java command not found."
}

if (-not $javaOK) {
    Write-Info "Installing OpenJDK 17 (adoptium) via Chocolatey..."
    Choco-Install-IfMissing "temurin17"  # temurin17 is the preferred package name in choco
    # Set JAVA_HOME if found under Program Files
    $possiblePaths = @(
        "C:\Program Files\Eclipse Adoptium\jdk-17*",
        "C:\Program Files\Adoptium\jdk-17*",
        "C:\Program Files\AdoptOpenJDK\jdk-17*",
        "C:\Program Files\Temurin\jdk-17*"
    )
    $jdkFound = $null
    foreach ($p in $possiblePaths) {
        $g = Get-ChildItem -Path $p -Directory -ErrorAction SilentlyContinue
        if ($g) { $jdkFound = $g[0].FullName; break }
    }
    if ($jdkFound) {
        Write-Info "Found JDK at $jdkFound"
        setx JAVA_HOME $jdkFound | Out-Null
        [Environment]::SetEnvironmentVariable("JAVA_HOME",$jdkFound,"Machine")
        Write-Succ "JAVA_HOME set to $jdkFound"
    } else {
        Write-Warn "Could not auto-detect JDK path. Please set JAVA_HOME manually if needed."
    }
} else {
    Write-Info "Java ok (17). Ensuring JAVA_HOME is set..."
    if (-not $env:JAVA_HOME) {
        # Try to find a JDK17 folder and set JAVA_HOME
        $detectPaths = Get-ChildItem "C:\Program Files" -Directory -Filter "*jdk-17*" -Recurse -ErrorAction SilentlyContinue
        if ($detectPaths) {
            $p = $detectPaths[0].FullName
            setx JAVA_HOME $p | Out-Null
            [Environment]::SetEnvironmentVariable("JAVA_HOME",$p,"Machine")
            Write-Succ "JAVA_HOME set to $p"
        } else {
            Write-Warn "JAVA_HOME not set; gradle may still find java via PATH. Consider setting JAVA_HOME to JDK17 install."
        }
    } else {
        Write-Succ "JAVA_HOME already set: $env:JAVA_HOME"
    }
}

# -----------------------
# 3) Ensure Node + Python (for native builds)
# -----------------------
Write-Info "Ensuring Node (LTS) & Python present..."
Choco-Install-IfMissing "nodejs-lts"
Choco-Install-IfMissing "python"   # provides python for node-gyp

# Optional: Visual Studio Build Tools (only if you know you need native builds)
$installVS = $false
if ($installVS) { Choco-Install-IfMissing "visualstudio2022buildtools" } else { Write-Info "Skipping Visual Studio Build Tools install (set \$installVS = \$true to enable)"; }

# -----------------------
# 4) Detect Android SDK location
# -----------------------
Write-Info "Detecting Android SDK installation..."
$locLocal = "$env:LOCALAPPDATA\Android\Sdk"
$locProgram = "$env:ProgramFiles\Android\Android Studio\Sdk"  # sometimes
$chocoSdkPath = "C:\ProgramData\chocolatey\lib\android-sdk\tools"  # fallback (not preferred)

$sdkPath = $null
if (Test-Path $locLocal) { $sdkPath = $locLocal }
elseif (Test-Path $locProgram) { $sdkPath = $locProgram }
elseif (Test-Path $chocoSdkPath) { $sdkPath = $chocoSdkPath }

if ($sdkPath) {
    Write-Succ "Android SDK detected at: $sdkPath"
} else {
    Write-Warn "Android SDK not detected in common locations."
    Write-Info "We will install Android Commandline Tools (if possible) to manage SDK via sdkmanager."
    Choco-Install-IfMissing "android-sdk"  # still install commandline tools (note: may differ)
    # After install, try to find sdk
    if (Test-Path $locLocal) { $sdkPath = $locLocal }
    elseif (Test-Path $chocoSdkPath) { $sdkPath = $chocoSdkPath }
    if ($sdkPath) { Write-Succ "Android SDK now detected at: $sdkPath" } else { Write-Warn "Android SDK still not detected. Please install Android Studio and open it to install SDK or install commandline tools." }
}

# -----------------------
# 5) Ensure sdkmanager exists and install required components
# -----------------------
function Get-SdkManager {
    param($sdkRoot)
    $poss = @(
        Join-Path $sdkRoot "tools\bin\sdkmanager.exe",
        Join-Path $sdkRoot "cmdline-tools\latest\bin\sdkmanager.bat",
        Join-Path $sdkRoot "cmdline-tools\bin\sdkmanager.bat",
        Join-Path $sdkRoot "tools\bin\sdkmanager.bat"
    )
    foreach ($p in $poss) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

if ($sdkPath) {
    # set ANDROID_HOME and ANDROID_SDK_ROOT
    Write-Info "Setting ANDROID_HOME and ANDROID_SDK_ROOT..."
    setx ANDROID_HOME $sdkPath | Out-Null
    setx ANDROID_SDK_ROOT $sdkPath | Out-Null
    [Environment]::SetEnvironmentVariable("ANDROID_HOME",$sdkPath,"Machine")
    [Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT",$sdkPath,"Machine")
    # Update PATH safely (no duplicates)
    $currentPath = [Environment]::GetEnvironmentVariable("Path","Machine")
    $toAdd = "$sdkPath\platform-tools"
    if ($currentPath -notlike "*$toAdd*") {
        $newPath = $currentPath + ";" + $toAdd
        [Environment]::SetEnvironmentVariable("Path",$newPath,"Machine")
        Write-Succ "Added $toAdd to machine PATH"
    } else {
        Write-Info "platform-tools already in PATH"
    }

    $sdkmanager = Get-SdkManager -sdkRoot $sdkPath
    if ($sdkmanager) {
        Write-Succ "Found sdkmanager: $sdkmanager"
        # Ensure licenses accepted and components installed
        Write-Info "Installing essential SDK packages: platform-tools, build-tools;34.0.0, platforms;android-34"
        & $sdkmanager --install "platform-tools" "platforms;android-34" "build-tools;34.0.0" --verbose
        if ($LASTEXITCODE -ne 0) { Write-Warn "sdkmanager returned non-zero exit code ($LASTEXITCODE). You may need to run Android Studio SDK Manager manually." }
        # Accept licenses
        try {
            Write-Info "Accepting SDK licenses..."
            yes.exe | & $sdkmanager --licenses 2>$null
            Write-Succ "SDK licenses accepted (attempted)."
        } catch {
            Write-Warn "Could not auto-accept licenses. Open Android Studio -> SDK Manager -> SDK Tools -> Show Package Details and accept licenses manually."
        }
    } else {
        Write-Warn "sdkmanager not found under SDK path. Please open Android Studio and install 'Android SDK Command-line Tools', then re-run this script or use SDK Manager GUI."
    }
} else {
    Write-Err "No Android SDK path available. Please install Android Studio and the Android SDK or set ANDROID_SDK_ROOT manually."
}

# -----------------------
# 6) NPM install (project)
# -----------------------
Write-Info "Running npm install in project root..."
try {
    npm install
    Write-Succ "npm install completed."
} catch {
    Write-Err "npm install failed. See npm output. You may need to run PowerShell as Administrator or install dependencies manually."
}

# -----------------------
# 7) React Native doctor (diagnose)
# -----------------------
Write-Info "Running 'npx react-native doctor' to check environment (interactive)..."
try {
    npx react-native doctor
} catch {
    Write-Warn "'react-native doctor' may require interactive input. If it fails, run 'npx react-native doctor' manually in a new shell."
}

# -----------------------
# 8) Final output & instructions
# -----------------------
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Succ "Setup script finished (v3.1)."
Write-Host "IMPORTANT:"
Write-Host "1) Close this PowerShell window and open a NEW Admin PowerShell to reload machine-level environment variables (PATH, JAVA_HOME, ANDROID_SDK_ROOT)."
Write-Host "2) Open Android Studio at least once, open SDK Manager and verify: 'Android SDK Platform 34', 'Android SDK Build-Tools 34.x', 'Android SDK Platform-Tools'."
Write-Host "3) If you want an emulator, open AVD Manager (Android Studio) -> create a Pixel device with Android 34 system image."
Write-Host "4) To build & run the app: run in project root (new shell):"
Write-Host "     npx react-native run-android"
Write-Host "   Or first just start Metro: npx react-native start"
Write-Host "========================================`n"
