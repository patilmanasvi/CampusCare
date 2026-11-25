# ==============================================================================
# CampusCare Backend - Phase 3 Core APIs PowerShell Verification Script
# Runs against running server at http://localhost:5000
# ==============================================================================

param (
    [string]$BaseUrl = "http://localhost:5000/api"
)

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " CampusCare Phase 3 - Core APIs Verification Test Suite" -ForegroundColor Cyan
Write-Host " Target API: $BaseUrl" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan

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
    Write-Host "`nCannot proceed without authentication token. Please verify PostgreSQL is running.`n" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $teacherToken" }

# ------------------------------------------------------------------------------
# 2. TASK A: Fetch Blocks (GET /api/blocks)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/blocks" -Method GET -Headers $headers
    $hasItems = ($res.items.Count -gt 0)
    Report-Result "Fetch Blocks (GET /api/blocks)" $hasItems "Found $($res.items.Count) blocks"
} catch {
    Report-Result "Fetch Blocks (GET /api/blocks)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 3. TASK A: Fetch Labs (GET /api/labs)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/labs" -Method GET -Headers $headers
    $hasItems = ($res.items.Count -gt 0)
    Report-Result "Fetch Labs (GET /api/labs)" $hasItems "Found $($res.items.Count) labs"
} catch {
    Report-Result "Fetch Labs (GET /api/labs)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 4. TASK A: Fetch PCs (GET /api/pcs)
# ------------------------------------------------------------------------------
$firstPcId = $null
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/pcs" -Method GET -Headers $headers
    $hasItems = ($res.items.Count -gt 0)
    if ($hasItems) { $firstPcId = $res.items[0].id }
    $noTokenLeak = ($null -eq $res.items[0].qr_token -and $null -eq $res.items[0].qrToken)
    Report-Result "Fetch PCs (GET /api/pcs)" ($hasItems -and $noTokenLeak) "Found $($res.items.Count) PCs (QR tokens secured)"
} catch {
    Report-Result "Fetch PCs (GET /api/pcs)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 5. TASK A: QR Lookup (GET /api/pcs/qr/:token)
# ------------------------------------------------------------------------------
try {
    $qrToken = "qr-campuscare-522-01"
    $res = Invoke-RestMethod -Uri "$BaseUrl/pcs/qr/$qrToken" -Method GET -Headers $headers
    $matched = ($res.pc.displayCode -eq "522/A/1")
    Report-Result "QR Token Lookup (GET /api/pcs/qr/:token)" $matched "Display Code: $($res.pc.displayCode) | Room: $($res.pc.room)"
} catch {
    Report-Result "QR Token Lookup (GET /api/pcs/qr/:token)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 6. TASK B: Duplicate Check (GET /api/tickets/check-duplicate)
# ------------------------------------------------------------------------------
if ($firstPcId) {
    try {
        $res = Invoke-RestMethod -Uri "$BaseUrl/tickets/check-duplicate?pcId=$firstPcId" -Method GET -Headers $headers
        Report-Result "Duplicate Check (GET /api/tickets/check-duplicate)" ($res.success -eq $true) "Active duplicate matches: $($res.matches.Count)"
    } catch {
        Report-Result "Duplicate Check (GET /api/tickets/check-duplicate)" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# 7. TASK C: Create Ticket (POST /api/tickets)
# ------------------------------------------------------------------------------
$createdTicketId = $null
if ($firstPcId) {
    try {
        $idemKey = "ps-test-" + [guid]::NewGuid().ToString()
        $ticketBody = @{
            pcId = $firstPcId
            categoryId = "cat-display"
            subcategoryId = "sub-no-display"
            urgency = "HIGH"
            description = "PowerShell Automated Test: Monitor flickers and loses signal."
            remarks = "Checked connections"
        } | ConvertTo-Json

        $ticketHeaders = @{
            Authorization = "Bearer $teacherToken"
            "Idempotency-Key" = $idemKey
        }

        $res = Invoke-RestMethod -Uri "$BaseUrl/tickets" -Method POST -Body $ticketBody -ContentType "application/json" -Headers $ticketHeaders
        $createdTicketId = $res.ticket.id
        Report-Result "Create Ticket with Transaction (POST /api/tickets)" ($null -ne $createdTicketId) "Created: $createdTicketId (Status: $($res.ticket.status))"
    } catch {
        Report-Result "Create Ticket with Transaction (POST /api/tickets)" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# 8. TASK D: Fetch Teacher Requests (GET /api/tickets/my)
# ------------------------------------------------------------------------------
try {
    $res = Invoke-RestMethod -Uri "$BaseUrl/tickets/my" -Method GET -Headers $headers
    $hasItems = ($res.items.Count -gt 0)
    Report-Result "List My Tickets (GET /api/tickets/my)" $hasItems "Total tickets: $($res.total)"
} catch {
    Report-Result "List My Tickets (GET /api/tickets/my)" $false $_.Exception.Message
}

# ------------------------------------------------------------------------------
# 9. TASK D: Fetch Ticket Timeline (GET /api/tickets/:id/timeline)
# ------------------------------------------------------------------------------
if ($createdTicketId) {
    try {
        $res = Invoke-RestMethod -Uri "$BaseUrl/tickets/$createdTicketId/timeline" -Method GET -Headers $headers
        $hasTimeline = ($res.timeline.Count -gt 0)
        Report-Result "Ticket Timeline (GET /api/tickets/:id/timeline)" $hasTimeline "Initial event: $($res.timeline[0].type)"
    } catch {
        Report-Result "Ticket Timeline (GET /api/tickets/:id/timeline)" $false $_.Exception.Message
    }
}

# ------------------------------------------------------------------------------
# 10. TASK D: Add Comment (POST /api/tickets/:id/comments)
# ------------------------------------------------------------------------------
if ($createdTicketId) {
    try {
        $commentBody = @{ body = "PowerShell automated test comment on cabling." } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$BaseUrl/tickets/$createdTicketId/comments" -Method POST -Body $commentBody -ContentType "application/json" -Headers $headers
        Report-Result "Add Comment (POST /api/tickets/:id/comments)" ($res.success -eq $true) "Comment recorded successfully"
    } catch {
        Report-Result "Add Comment (POST /api/tickets/:id/comments)" $false $_.Exception.Message
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Verification Summary: $passCount Passed, $failCount Failed" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "==========================================================`n" -ForegroundColor Cyan
