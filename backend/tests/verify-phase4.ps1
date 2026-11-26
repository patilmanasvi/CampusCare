# ==============================================================================
# CampusCare Backend - Phase 4 Advanced APIs PowerShell Verification Script
# Runs against running server at http://localhost:5000
# ==============================================================================

param (
    [string]$BaseUrl = "http://localhost:5000/api"
)

Write-Host "`n==============================================================" -ForegroundColor Cyan
Write-Host " CampusCare Phase 4 - Advanced APIs Verification Test Suite" -ForegroundColor Cyan
Write-Host " Target API: $BaseUrl" -ForegroundColor Cyan
Write-Host "==============================================================`n" -ForegroundColor Cyan

$passCount = 0
$failCount = 0

function Report-Result {
    param (
        [string]$TestName,
        [bool]$Success,
        [string]$Details
    )
    if ($Success) {
        Write-Host " [PASS] $TestName" -ForegroundColor Green
        if ($Details) { Write-Host "        $Details" -ForegroundColor Gray }
        $script:passCount++
    } else {
        Write-Host " [FAIL] $TestName" -ForegroundColor Red
        if ($Details) { Write-Host "        $Details" -ForegroundColor Yellow }
        $script:failCount++
    }
}

# ------------------------------------------------------------------------------
# 1. Login Teacher to obtain JWT Token
# ------------------------------------------------------------------------------
$teacherToken = $null
try {
    $loginBody = @{ email = "teacher@college.edu"; password = "password123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $teacherToken = $res.token
    Report-Result "Teacher Authentication" ($null -ne $teacherToken) "Logged in as: $($res.user.fullName)"
} catch {
    Report-Result "Teacher Authentication" $false $_.Exception.Message
}

if (-not $teacherToken) {
    Write-Host "`nCannot proceed without authentication token. Please verify server and database are running.`n" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $teacherToken" }

# ------------------------------------------------------------------------------
# 2. TASK A: Dashboard Summary (GET /api/dashboard/summary)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/dashboard/summary" -Method GET -Headers $headers
    $hasFields = ($null -ne $res.total -and $null -ne $res.pending -and $null -ne $res.inProgress)
    Report-Result "Dashboard Summary (GET /api/dashboard/summary)" $hasFields "Total: $($res.total), Pending: $($res.pending), In-Progress: $($res.inProgress)"
} catch {
    Report-Result "Dashboard Summary (GET /api/dashboard/summary)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 3. TASK A: Recent Requests (GET /api/dashboard/recent-requests)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/dashboard/recent-requests?limit=5" -Method GET -Headers $headers
    Report-Result "Dashboard Recent Requests (GET /api/dashboard/recent-requests)" ($res.success -eq $true) "Returned $($res.items.Count) recent requests"
} catch {
    Report-Result "Dashboard Recent Requests (GET /api/dashboard/recent-requests)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 4. TASK B: Profile Fetch (GET /api/profile)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/profile" -Method GET -Headers $headers
    $matches = ($res.profile.email -eq "teacher@college.edu")
    Report-Result "Fetch Profile (GET /api/profile)" $matches "Profile Email: $($res.profile.email) | Role: $($res.profile.role)"
} catch {
    Report-Result "Fetch Profile (GET /api/profile)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 5. TASK B: Protected Field Defense (PATCH /api/profile with role)
# ------------------------------------------------------------------------------
try {
    $escalationBody = @{ role = "ADMIN" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/profile" -Method PATCH -Body $escalationBody -ContentType "application/json" -Headers $headers
    Report-Result "Protected Field Defense (403)" $false "Expected 403 Forbidden but got 200"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $is403 = ($statusCode -eq 403)
    Report-Result "Protected Field Defense (403)" $is403 "HTTP Status: $statusCode (Privilege escalation blocked)"
}

# ------------------------------------------------------------------------------
# 6. TASK C: Notifications List & Unread Count
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/notifications" -Method GET -Headers $headers
    Report-Result "List Notifications (GET /api/notifications)" ($res.success -eq $true) "Total notifs: $($res.total), Unread: $($res.unreadCount)"
} catch {
    Report-Result "List Notifications (GET /api/notifications)" $false $_.Exception.Message
}

try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/notifications/read-all" -Method PATCH -Headers $headers
    Report-Result "Mark All Notifications Read (PATCH /api/notifications/read-all)" ($res.success -eq $true) $res.message
} catch {
    Report-Result "Mark All Notifications Read (PATCH /api/notifications/read-all)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 7. TASK D: Upload Config (GET /api/uploads/config)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/uploads/config" -Method GET
    $hasTypes = ($res.acceptedMimeTypes.Count -gt 0)
    Report-Result "Upload Configuration (GET /api/uploads/config)" $hasTypes "Max size: $($res.maxFileSizeBytes) bytes | $($res.acceptedMimeTypes.Count) MIME types"
} catch {
    Report-Result "Upload Configuration (GET /api/uploads/config)" $false $_.Exception.Message
}

Write-Host "`n==============================================================" -ForegroundColor Cyan
Write-Host " Verification Summary: $passCount Passed, $failCount Failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "==============================================================`n" -ForegroundColor Cyan
