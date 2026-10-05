import 'package:flutter/material.dart';
import '../../auth/auth_service.dart';
import '../lawyer_api.dart';
import '../widgets.dart';
import '../design.dart';

class ChangePasswordScreen extends StatefulWidget {
  final bool requiredChange;
  const ChangePasswordScreen({super.key, this.requiredChange = false});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final form = GlobalKey<FormState>();
  final current = TextEditingController(),
      next = TextEditingController(),
      confirm = TextEditingController();
  bool saving = false;
  @override
  void dispose() {
    current.dispose();
    next.dispose();
    confirm.dispose();
    super.dispose();
  }

  Future<void> save() async {
    if (!form.currentState!.validate()) return;
    setState(() => saving = true);
    try {
      await LawyerApi.changePassword(current.text, next.text, confirm.text);
      if (mounted && !widget.requiredChange) Navigator.pop(context);
    } catch (e) {
      if (mounted) await showLawyerError(context, e);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !widget.requiredChange,
    child: LawyerPage(
      title: 'Change Password',
      automaticallyImplyLeading: !widget.requiredChange,
      body: Form(
        key: form,
        child: ListView(
          padding: LawyerDesign.pagePadding,
          children: [
            if (widget.requiredChange)
              const Text(
                'Set a personal password before accessing your lawyer dashboard.',
              ),
            if (!widget.requiredChange)
              const Text(
                'Keep your account secure with a personal password.',
                style: TextStyle(color: LawyerDesign.muted),
              ),
            const SizedBox(height: 24),
            TextFormField(
              controller: current,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current password'),
              validator: (v) => v == null || v.isEmpty
                  ? 'Enter your current password.'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: next,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
              validator: (v) =>
                  v == null ||
                      v.length < 12 ||
                      !RegExp(r'[a-zA-Z]').hasMatch(v) ||
                      !RegExp(r'[0-9]').hasMatch(v)
                  ? 'Use at least 12 characters, including letters and numbers.'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: confirm,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirm new password',
              ),
              validator: (v) =>
                  v != next.text ? 'Passwords do not match.' : null,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: saving ? null : save,
              child: Text(saving ? 'Saving…' : 'Change Password'),
            ),
            if (widget.requiredChange)
              TextButton(
                onPressed: saving ? null : AuthService.logout,
                child: const Text('Sign Out'),
              ),
          ],
        ),
      ),
    ),
  );
}
