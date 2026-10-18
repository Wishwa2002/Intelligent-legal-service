using UglyToad.PdfPig;

namespace LegalService.API.Services;

/// <summary>Checks the format supplied by the bytes, independently of client metadata.
/// This is format validation, not antivirus scanning or PDF active-content sanitisation.</summary>
internal static class DocumentContentValidator
{
    internal static void Validate(byte[] bytes, string extension, string contentType)
    {
        var mimeMatches = extension switch
        {
            ".pdf" => contentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase),
            ".png" => contentType.Equals("image/png", StringComparison.OrdinalIgnoreCase),
            ".jpg" or ".jpeg" => contentType.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase) || contentType.Equals("image/jpg", StringComparison.OrdinalIgnoreCase),
            _ => false
        };
        if (!mimeMatches) throw new ArgumentException("File extension and MIME type do not match.");
        var data = bytes.AsSpan();
        if (extension == ".pdf")
        {
            // Permit an optional prefix (PDF readers allow the header in the first 1024 bytes).
            if (data[..Math.Min(data.Length, 1024)].IndexOf("%PDF-"u8) < 0)
                throw new ArgumentException("Uploaded content is not a PDF document.");
            try
            {
                using var pdf = PdfDocument.Open(bytes);
                if (pdf.NumberOfPages < 1) throw new ArgumentException("PDF contains no pages.");
                _ = pdf.GetPage(1); // Materialise the page tree/content, not just the header.
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not OperationCanceledException)
            {
                throw new ArgumentException("Uploaded PDF content cannot be read.", nameof(bytes), ex);
            }
        }
        else if (extension == ".png")
        {
            if (data.Length < 33 || !data.StartsWith(new byte[] {137,80,78,71,13,10,26,10}) ||
                !data.Slice(12,4).SequenceEqual("IHDR"u8) ||
                !data.EndsWith(new byte[] {0,0,0,0,73,69,78,68,174,66,96,130}))
                throw new ArgumentException("Uploaded content is not a complete PNG image.");
        }
        else if (data.Length < 4 || data[0] != 0xff || data[1] != 0xd8 || data[2] != 0xff ||
                 data[^2] != 0xff || data[^1] != 0xd9)
            throw new ArgumentException("Uploaded content is not a complete JPEG image.");
    }
}
