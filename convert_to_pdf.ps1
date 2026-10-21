$docxPath = "c:\Users\Tanmay\Desktop\collegeProject\NLP\Panel_A_API_Evolution_NLP_Team4.docx"
$pdfPath = "c:\Users\Tanmay\Desktop\collegeProject\NLP\Panel_A_API_Evolution_NLP_Team4.pdf"

Write-Host "Opening Word COM to convert DOCX to PDF..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($docxPath)
    # 17 corresponds to wdFormatPDF
    $doc.SaveAs([ref]$pdfPath, [ref]17)
    $doc.Close()
    Write-Host "[SUCCESS] PDF exported successfully to: $pdfPath"
} catch {
    Write-Host "[ERROR] Failed to convert: $_"
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
