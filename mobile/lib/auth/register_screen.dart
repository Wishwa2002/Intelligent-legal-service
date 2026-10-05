import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import 'auth_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _loading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

 Future<void> _handleRegister() async {
  if (!_formKey.currentState!.validate()) return;

  setState(() {
    _loading = true;
    _errorMessage = null;
  });

  try {
    await AuthService.register(
      fullName: _fullNameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Registration successful. Please login with your credentials.'
          ),
          backgroundColor: Color(0xFF16A34A),
        ),
      );

      Navigator.pop(context);
    }

  } catch (e) {

    if (mounted) {

      String message =
          "Registration failed. Please try again.";

      final error = e.toString().toLowerCase();

      if (error.contains("already exists") ||
    error.contains("already registered")) {

    message =
      "An account with this email already exists.";
}
      else if (error.contains("socket") ||
         error.contains("connection") ||
         error.contains("timeout")) {

    message =
      "Unable to connect to server.";
}

      setState(() {
        _errorMessage = message;
      });
    }

  } finally {

    if (mounted) {
      setState(() {
        _loading = false;
      });
    }
  }
}



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Account', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryNavy,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text('⚖️', style: TextStyle(fontSize: 20)),
                    ),
                    const SizedBox(width: 10),
                    const Text(
                      'Join LegalEase',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryNavy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Register your client account to access legal consultations and documents',
                  style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                ),
                const SizedBox(height: 24),

                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                TextFormField(
                  controller: _fullNameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    prefixIcon: Icon(Icons.person_outline),
                    border: OutlineInputBorder(),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Please enter your full name';
                    }

                    if (val.trim().length < 3) {
                      return 'Name must contain at least 3 characters';
                    }

                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icon(Icons.email_outlined),
                    border: OutlineInputBorder(),
                  ),
                  validator: (val) {

                    if (val == null || val.trim().isEmpty) {
                      return 'Please enter your email';
                    }

                    final emailRegex = RegExp(
                      r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$'
                    );

                    if (!emailRegex.hasMatch(val.trim())) {
                      return 'Please enter a valid email address';
                    }

                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                    border: const OutlineInputBorder(),
                  ),
                  validator: (val) {

                    if (val == null || val.isEmpty) {
                      return 'Please enter a password';
                    }

                    if (val.length < 8) {
                      return 'Password must be at least 8 characters';
                    }

                    if (!RegExp(r'[A-Z]').hasMatch(val)) {
                      return 'Password needs an uppercase letter';
                    }

                    if (!RegExp(r'[a-z]').hasMatch(val)) {
                      return 'Password needs a lowercase letter';
                    }

                    if (!RegExp(r'[0-9]').hasMatch(val)) {
                      return 'Password needs a number';
                    }

                    if (!RegExp(r'[!@#$%^&*]').hasMatch(val)) {
                      return 'Password needs a special character';
                    }

                    return null;
                  },
                ),

                const SizedBox(height: 8),

                const Text(
                  'Password requirements:\n'
                  '• Minimum 8 characters\n'
                  '• At least one uppercase letter\n'
                  '• At least one lowercase letter\n'
                  '• At least one number\n'
                  '• At least one special character',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textMuted,
                  ),
                ),

                const SizedBox(height: 24),


                ElevatedButton(
                  onPressed: _loading ? null : _handleRegister,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.gold,
                    foregroundColor: AppTheme.primaryNavy,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryNavy),
                        )
                      : const Text('Create Account', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
