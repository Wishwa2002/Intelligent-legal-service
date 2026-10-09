import 'package:flutter/material.dart';

/// A lightweight, robust widget that formats Markdown text (bold **text**, bullet points, numbered lists)
/// without leaving raw markdown artifacts like '**' on the screen.
class MarkdownFormattedText extends StatelessWidget {
  final String text;
  final TextStyle baseStyle;
  final Color? boldColor;

  const MarkdownFormattedText({
    super.key,
    required this.text,
    required this.baseStyle,
    this.boldColor,
  });

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();

    final lines = text.split('\n');
    final List<Widget> lineWidgets = [];

    for (int i = 0; i < lines.length; i++) {
      final rawLine = lines[i];
      final trimmed = rawLine.trim();

      if (trimmed.isEmpty) {
        // Line break spacing
        lineWidgets.add(const SizedBox(height: 6));
        continue;
      }

      // Check for bullet line (•, -, *)
      final isBullet = trimmed.startsWith('•') ||
          (trimmed.startsWith('- ') && !trimmed.startsWith('---')) ||
          trimmed.startsWith('* ') ||
          trimmed.startsWith('👉');

      // Check for numbered list (1., 2., etc.)
      final numberMatch = RegExp(r'^(\d+)\.\s+(.*)$').firstMatch(trimmed);

      // Check for header (###, ##, #)
      final isHeader = trimmed.startsWith('#');

      if (isBullet) {
        String bulletChar = '•';
        String content = trimmed;
        if (trimmed.startsWith('•')) {
          content = trimmed.substring(1).trim();
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          content = trimmed.substring(2).trim();
        } else if (trimmed.startsWith('👉')) {
          bulletChar = '👉';
          content = trimmed.substring(2).trim();
        }

        lineWidgets.add(
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$bulletChar  ',
                  style: baseStyle.copyWith(
                    fontWeight: FontWeight.bold,
                    color: boldColor ?? baseStyle.color,
                  ),
                ),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      children: _parseInlineSpans(content, baseStyle, boldColor),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      } else if (numberMatch != null) {
        final numStr = numberMatch.group(1);
        final content = numberMatch.group(2) ?? '';

        lineWidgets.add(
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$numStr.  ',
                  style: baseStyle.copyWith(
                    fontWeight: FontWeight.bold,
                    color: boldColor ?? baseStyle.color,
                  ),
                ),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      children: _parseInlineSpans(content, baseStyle, boldColor),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      } else if (isHeader) {
        final headerText = trimmed.replaceAll(RegExp(r'^#+\s*'), '');
        lineWidgets.add(
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: RichText(
              text: TextSpan(
                children: _parseInlineSpans(
                  headerText,
                  baseStyle.copyWith(
                    fontWeight: FontWeight.bold,
                    fontSize: (baseStyle.fontSize ?? 14) + 1.5,
                  ),
                  boldColor,
                ),
              ),
            ),
          ),
        );
      } else {
        // Normal paragraph line
        lineWidgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: RichText(
              text: TextSpan(
                children: _parseInlineSpans(rawLine, baseStyle, boldColor),
              ),
            ),
          ),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: lineWidgets,
    );
  }

  /// Parses inline bold syntax (**text**) into styled TextSpans.
  /// Removes raw asterisks cleanly.
  static List<TextSpan> _parseInlineSpans(String text, TextStyle baseStyle, Color? boldColor) {
    final List<TextSpan> spans = [];
    final pattern = RegExp(r'\*\*(.*?)\*\*');
    int lastIndex = 0;

    for (final match in pattern.allMatches(text)) {
      if (match.start > lastIndex) {
        // Non-bold text segment
        final before = text.substring(lastIndex, match.start);
        spans.add(TextSpan(text: before, style: baseStyle));
      }

      final boldText = match.group(1) ?? '';
      spans.add(
        TextSpan(
          text: boldText,
          style: baseStyle.copyWith(
            fontWeight: FontWeight.bold,
            color: boldColor ?? baseStyle.color,
          ),
        ),
      );

      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      final remaining = text.substring(lastIndex);
      // Clean any accidental dangling asterisks
      final cleaned = remaining.replaceAll('**', '');
      spans.add(TextSpan(text: cleaned, style: baseStyle));
    }

    return spans;
  }
}
