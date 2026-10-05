import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../config/app_theme.dart';

void showServerSettingsDialog(BuildContext context, {VoidCallback? onSaved}) {
  final controller = TextEditingController(text: ApiConfig.backendUrl.value);
  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setState) {
        bool testing = false;
        String? result;
        Future<void> runTest() async {
          setState(() { testing = true; result = null; });
          try {
            final response = await http.get(Uri.parse('${controller.text.trim()}/health'))
                .timeout(const Duration(seconds: 10));
            result = 'ASP.NET API: HTTP ${response.statusCode}';
          } catch (_) {
            result = 'ASP.NET API is unreachable.';
          }
          setState(() { testing = false; });
        }
        return AlertDialog(
          title: const Text('Server Configuration'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: controller, decoration: const InputDecoration(labelText: 'ASP.NET API URL')),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: testing ? null : runTest,
              icon: const Icon(Icons.network_check, color: AppTheme.primaryNavy),
              label: Text(testing ? 'Testing...' : 'Test Connection'),
            ),
            if (result != null) Text(result!),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(onPressed: () async {
              await ApiConfig.setBackendUrl(controller.text);
              if (context.mounted) Navigator.pop(ctx);
              onSaved?.call();
            }, child: const Text('Save & Apply')),
          ],
        );
      },
    ),
  );
}
