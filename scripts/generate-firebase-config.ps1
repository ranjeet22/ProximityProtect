$projectRoot = Split-Path -Path $PSScriptRoot -Parent
$envFile = Join-Path $projectRoot ".env"
$outputFile = Join-Path $projectRoot "config\\firebase-config.local.js"

if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
    exit 1
}

$envMap = @{}

Get-Content -Path $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
        return
    }

    $parts = $line -split "=", 2
    if ($parts.Length -eq 2) {
        $envMap[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$requiredKeys = @(
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_APP_ID"
)

$missingKeys = $requiredKeys | Where-Object { -not $envMap.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($envMap[$_]) }
if ($missingKeys.Count -gt 0) {
    Write-Error "Missing required .env keys: $($missingKeys -join ', ')"
    exit 1
}

$measurementId = if ($envMap.ContainsKey("FIREBASE_MEASUREMENT_ID")) { $envMap["FIREBASE_MEASUREMENT_ID"] } else { "" }

$content = @"
window.PROXIMITY_PROTECT_FIREBASE_CONFIG = {
    apiKey: "$($envMap["FIREBASE_API_KEY"])",
    authDomain: "$($envMap["FIREBASE_AUTH_DOMAIN"])",
    projectId: "$($envMap["FIREBASE_PROJECT_ID"])",
    storageBucket: "$($envMap["FIREBASE_STORAGE_BUCKET"])",
    messagingSenderId: "$($envMap["FIREBASE_MESSAGING_SENDER_ID"])",
    appId: "$($envMap["FIREBASE_APP_ID"])",
    measurementId: "$measurementId"
};
"@

Set-Content -Path $outputFile -Value $content -Encoding UTF8
Write-Host "Generated firebase-config.local.js from .env"
