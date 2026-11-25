# ==============================================================================
# CampusCare Backend - Phase 2 Authentication & Security Verification Script
# Runs against live running server on http://localhost:5000
# ==============================================================================

param (
    [string]$BaseUrl = "http://localhost:5000/api"
)

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " CampusCare Phase 2 - Backend Authentication Test Suite" -ForegroundColor Cyan
Write-Host " Target API: $BaseUrl" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

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
# Test 1: API Status / Root
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/" -Method GET
    Report-Result "API Root Endpoint" ($res.version -eq "1.0.0") "Version: $($res.version)"
} catch {
    Report-Result "API Root Endpoint" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# Test 2: Validation on Empty Login Request (Expected: 400 Bad Request)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body "{}" -ContentType "application/json"
    Report-Result "Empty Login Validation" $false "Expected 400 Bad Request but got 200"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $is400 = ($statusCode -eq 400)
    Report-Result "Empty Login Validation (400)" $is400 "HTTP Status: $statusCode (Validation caught empty payload)"
}

# ------------------------------------------------------------------------------
# Test 3: Incorrect Password Rejection (Expected: 401 Unauthorized)
# ------------------------------------------------------------------------------
try {
    $body = @{ email = "teacher@college.edu"; password = "wrongpassword" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $body -ContentType "application/json"
    Report-Result "Incorrect Password Rejection" $false "Expected 401 Unauthorized but got 200"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $is401 = ($statusCode -eq 401)
    Report-Result "Incorrect Password Rejection (401)" $is401 "HTTP Status: $statusCode (Invalid credentials rejected)"
}

# ------------------------------------------------------------------------------
# Test 4: Unauthenticated /api/auth/me Request (Expected: 401 Unauthorized)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method GET
    Report-Result "Unauthenticated /me Protection" $false "Expected 401 Unauthorized but got 200"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $is401 = ($statusCode -eq 401)
    Report-Result "Unauthenticated /me Protection (401)" $is401 "HTTP Status: $statusCode (Route is securely protected)"
}

# ------------------------------------------------------------------------------
# Test 5: Invalid Token Rejection (Expected: 401 Unauthorized)
# ------------------------------------------------------------------------------
try {
    $headers = @{ Authorization = "Bearer invalid_gibberish_token" }
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method GET -Headers $headers
    Report-Result "Invalid Token Rejection" $false "Expected 401 Unauthorized but got 200"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $is401 = ($statusCode -eq 401)
    Report-Result "Invalid Token Rejection (401)" $is401 "HTTP Status: $statusCode (Tampered token rejected)"
}

# ------------------------------------------------------------------------------
# Test 6: Teacher Successful Login (Expected: 200 OK + JWT Token)
# ------------------------------------------------------------------------------
$teacherToken = $null
try {
    $body = @{ email = "teacher@college.edu"; password = "password123" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $body -ContentType "application/json"
    $hasToken = ($null -ne $res.token)
    $hasRole = ($res.user.role -eq "TEACHER")
    $noHash = ($null -eq $res.user.password_hash)
    $teacherToken = $res.token
    Report-Result "Teacher Login (200 + Safe Profile)" ($hasToken -and $hasRole -and $noHash) "Signed in as: $($res.user.fullName) | Role: $($res.user.role)"
} catch {
    Report-Result "Teacher Login (200 + Safe Profile)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# Test 7: Fetch Authenticated User Profile (/api/auth/me) with Bearer Token
# ------------------------------------------------------------------------------
if ($teacherToken) {
    try {
        $headers = @{ Authorization = "Bearer $teacherToken" }
        $res = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method GET -Headers $headers
        $matches = ($res.user.email -eq "teacher@college.edu")
        Report-Result "Fetch Current User /me via Bearer Token" $matches "Retrieved user: $($res.user.fullName)"
    } catch {
        Report-Result "Fetch Current User /me via Bearer Token" $false $_.Exception.Message
    }
} else {
    Report-Result "Fetch Current User /me via Bearer Token" $false "Skipped: login did not return token (check DB connection)"
}

# ------------------------------------------------------------------------------
# Test 8: Logout Endpoint (POST /api/auth/logout)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method POST
    Report-Result "Logout Endpoint (200 OK)" ($res.success -eq $true) $res.message
} catch {
    Report-Result "Logout Endpoint (200 OK)" $false $_.Exception.Message
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " Verification Summary: $passCount Passed, $failCount Failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================================`n" -ForegroundColor Cyan
