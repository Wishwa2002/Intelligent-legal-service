import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../config/app_theme.dart';

void showServerSettingsDialog(BuildContext context, {VoidCallback? onSaved}) {
  final backendController = TextEditingController(text: ApiConfig.backendUrl.value);
  final aiController = TextEditingController(text: ApiConfig.aiServiceUrl.value);

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setState) {
        bool testing = false;
        String? testResult;
        bool testSuccess = false;

        Future<void> runTest() async {
          setState(() {
            testing = true;
            testResult = null;
          });

          final backend = backendController.text.trim();
          final ai = aiController.text.trim();

          String bStatus = 'Unreachable';
          String aStatus = 'Unreachable';
          bool ok = false;

          try {
            final bRes = await http
                .get(Uri.parse('$backend/api/documentation-services'))
                .timeout(const Duration(seconds: 4));
            bStatus = 'HTTP ${bRes.statusCode}';
            if (bRes.statusCode == 200) ok = true;
          } catch (e) {
            bStatus = 'Failed ($e)';
          }

          try {
            final aRes = await http
                .get(Uri.parse('$ai/health'))
                .timeout(const Duration(seconds: 4));
            aStatus = 'HTTP ${aRes.statusCode}';
          } catch (e) {
            aStatus = 'Failed ($e)';
          }

          setState(() {
            testing = false;
            testSuccess = ok;
            testResult = 'Backend: $bStatus\nAI Service: $aStatus';
          });
        }

        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.settings_ethernet, color: AppTheme.primaryNavy),
              SizedBox(width: 8),
              Text('Server Configuration', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select a preset below or enter your custom URL:',
                    style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                const SizedBox(height: 16),
                TextField(
                  controller: backendController,
                  decoration: const InputDecoration(
                    labelText: 'Backend API URL',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: aiController,
                  decoration: const InputDecoration(
                    labelText: 'AI Service URL',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Quick Presets:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ActionChip(
                      label: const Text('USB Cable (localhost)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      backgroundColor: const Color(0xFFFEF3C7),
                      side: const BorderSide(color: AppTheme.secondaryAmber),
                      onPressed: () {
                        setState(() {
                          backendController.text = 'http://localhost:5000';
                          aiController.text = 'http://localhost:8001';
                        });
                      },
                    ),
                    ActionChip(
                      label: const Text('Wi-Fi LAN (10.78.57.23)', style: TextStyle(fontSize: 11)),
                      onPressed: () {
                        setState(() {
                          backendController.text = 'http://10.78.57.23:5000';
                          aiController.text = 'http://10.78.57.23:8001';
                        });
                      },
                    ),
                    ActionChip(
                      label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11)),
                      onPressed: () {
                        setState(() {
                          backendController.text = 'http://10.0.2.2:5000';
                          aiController.text = 'http://10.0.2.2:8001';
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: testing ? null : runTest,
                  icon: testing
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.network_check, size: 16),
                  label: Text(testing ? 'Testing...' : 'Test Connection'),
                ),
                if (testResult != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: testSuccess ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: testSuccess ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
                      ),
                    ),
                    child: Text(
                      testResult!,
                      style: TextStyle(
                        fontSize: 11,
                        color: testSuccess ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                await ApiConfig.setBackendUrl(backendController.text);
                await ApiConfig.setAiServiceUrl(aiController.text);
                if (context.mounted) Navigator.pop(ctx);
                onSaved?.call();
              },
              child: const Text('Save & Apply'),
            ),
          ],
        );
      },
    ),
  );
}
