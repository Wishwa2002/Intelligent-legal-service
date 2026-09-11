import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/career_model.dart';
import '../../services/auth_service.dart';
import '../../services/career_service.dart';

class JobApplicationDialog extends StatefulWidget {
  final CareerModel career;

  const JobApplicationDialog({super.key, required this.career});

  @override
  State<JobApplicationDialog> createState() => _JobApplicationDialogState();
}

class _JobApplicationDialogState extends State<JobApplicationDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService.currentUser.value;
    if (user != null) {
      _nameController.text = user.fullName;
      _emailController.text = user.email;
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      await CareerService.applyForJob(
        careerId: widget.career.careerId,
        applicantName: _nameController.text.trim(),
      );

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Application submitted successfully! Our legal HR team will be in touch.'),
            backgroundColor: AppTheme.statusCompleted,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Application failed: $e'),
            backgroundColor: AppTheme.statusRequiresDocs,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Apply for Role', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          Text(widget.career.jobTitle, style: const TextStyle(fontSize: 13, color: AppTheme.secondaryAmber, fontWeight: FontWeight.w600)),
        ],
      ),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Applicant Full Name',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) => v == null || v.trim().isEmpty ? 'Please enter your name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                prefixIcon: Icon(Icons.email_outlined),
              ),
              validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submitting ? null : _handleSubmit,
          child: _submitting
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Submit Application'),
        ),
      ],
    );
  }
}
