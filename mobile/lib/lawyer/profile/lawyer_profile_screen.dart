import 'package:flutter/material.dart';
import '../../auth/auth_service.dart';
import '../lawyer_api.dart';
import '../models.dart';
import '../widgets.dart';
import '../design.dart';
import 'change_password_screen.dart';

class LawyerProfileScreen extends StatelessWidget {
  const LawyerProfileScreen({super.key});
  @override
  Widget build(BuildContext context) => ServerPanel<LawyerProfile>(
    load: LawyerApi.profile,
    content: (p, reload) {
      final names = p.name
          .trim()
          .split(RegExp(r'\s+'))
          .where((s) => s.isNotEmpty)
          .toList();
      final initials = names.isEmpty
          ? '?'
          : '${names.first.characters.first}${names.length > 1 ? names.last.characters.first : ''}'
                .toUpperCase();
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: LawyerDesign.pagePadding,
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: LawyerDesign.cream,
            foregroundColor: LawyerDesign.navy,
            child: Text(
              initials,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            p.name,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Text(
            p.practiceArea,
            textAlign: TextAlign.center,
            style: const TextStyle(color: LawyerDesign.muted),
          ),
          const SizedBox(height: 8),
          Center(child: StatusChip(p.status)),
          const SizedBox(height: 16),
          Text(
            p.qualification.isEmpty
                ? 'Qualification not recorded'
                : p.qualification,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            '${p.experience} ${p.experience == 1 ? 'year' : 'years'} experience',
            textAlign: TextAlign.center,
            style: const TextStyle(color: LawyerDesign.muted),
          ),
          if (p.license.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                p.license,
                textAlign: TextAlign.center,
                style: const TextStyle(color: LawyerDesign.muted),
              ),
            ),
          const SizedBox(height: 24),
          const Divider(height: 1),
          const SizedBox(height: 24),
          const LawyerSectionHeader('CONTACT'),
          ProfileInfoRow('Email', p.email),
          ProfileInfoRow('Phone', p.phone),
          const SizedBox(height: 8),
          const LawyerSectionHeader('ABOUT'),
          ProfileInfoRow('Professional Description', p.description),
          const SizedBox(height: 8),
          const LawyerSectionHeader('ACCOUNT'),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              FilledButton(
                onPressed: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => EditLawyerProfile(profile: p),
                    ),
                  );
                  reload();
                },
                child: const Text('Edit Profile'),
              ),
              OutlinedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const ChangePasswordScreen(),
                  ),
                ),
                child: const Text('Change Password'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(height: 1),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: AuthService.logout,
              style: TextButton.styleFrom(foregroundColor: LawyerDesign.error),
              child: const Text('Sign Out'),
            ),
          ),
        ],
      );
    },
  );
}

class EditLawyerProfile extends StatefulWidget {
  final LawyerProfile profile;
  const EditLawyerProfile({super.key, required this.profile});
  @override
  State<EditLawyerProfile> createState() => _EditLawyerProfileState();
}

class _EditLawyerProfileState extends State<EditLawyerProfile> {
  late final TextEditingController phone, description;
  bool saving = false;
  @override
  void initState() {
    super.initState();
    phone = TextEditingController(text: widget.profile.phone);
    description = TextEditingController(text: widget.profile.description);
  }

  @override
  void dispose() {
    phone.dispose();
    description.dispose();
    super.dispose();
  }

  Future<void> save() async {
    setState(() => saving = true);
    try {
      await LawyerApi.saveProfile(phone.text, description.text);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) await showLawyerError(context, e);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => LawyerPage(
    title: 'Edit Profile',
    body: ListView(
      padding: LawyerDesign.pagePadding,
      children: [
        const Text(
          'Your verified professional details are managed by the administrator.',
          style: TextStyle(color: LawyerDesign.muted),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: phone,
          enabled: !saving,
          keyboardType: TextInputType.phone,
          maxLength: 50,
          decoration: const InputDecoration(labelText: 'Phone'),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: description,
          enabled: !saving,
          maxLines: 5,
          maxLength: 2000,
          decoration: const InputDecoration(
            labelText: 'Professional Description',
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: saving ? null : save,
          child: Text(saving ? 'Saving…' : 'Save Changes'),
        ),
      ],
    ),
  );
}
