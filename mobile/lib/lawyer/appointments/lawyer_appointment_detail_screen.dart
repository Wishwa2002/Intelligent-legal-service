import 'package:flutter/material.dart';
import '../models.dart';
import '../lawyer_api.dart';
import '../widgets.dart';
import '../design.dart';

class LawyerAppointmentDetailScreen extends StatefulWidget {
  final String id;
  const LawyerAppointmentDetailScreen({super.key, required this.id});
  @override
  State<LawyerAppointmentDetailScreen> createState() =>
      _LawyerAppointmentDetailScreenState();
}

class _LawyerAppointmentDetailScreenState
    extends State<LawyerAppointmentDetailScreen> {
  bool saving = false;
  Future<void> act(String action, VoidCallback reload) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          action == 'confirm'
              ? 'Confirm this appointment?'
              : 'Mark this appointment completed?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Back'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    setState(() => saving = true);
    try {
      await LawyerApi.action(widget.id, action);
      reload();
    } catch (e) {
      if (mounted) await showLawyerError(context, e);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => LawyerPage(
    title: 'Appointment',
    body: ServerPanel<LawyerAppointment>(
      load: () => LawyerApi.appointment(widget.id),
      content: (a, reload) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: LawyerDesign.pagePadding,
        children: [
          Align(alignment: Alignment.centerLeft, child: StatusChip(a.status)),
          const SizedBox(height: 16),
          Text(a.client, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 24),
          const LawyerSectionHeader('Date & Time'),
          Text(
            appointmentDate(a.date),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            '${shortTime(a.start)} – ${shortTime(a.end)} · Office time',
            style: const TextStyle(color: LawyerDesign.muted),
          ),
          const SizedBox(height: 24),
          ProfileInfoRow('Practice Area', a.practiceArea),
          ProfileInfoRow('Legal Service', a.legalService),
          ProfileInfoRow('Consultation', a.consultationType),
          const SizedBox(height: 8),
          const LawyerSectionHeader('Client Requirement'),
          Text(
            cleanLawyerText(a.description).isEmpty
                ? 'No client requirement recorded.'
                : cleanLawyerText(a.description),
            style: const TextStyle(height: 1.5),
          ),
          if (a.canConfirm || a.canComplete) ...[
            const SizedBox(height: 24),
            const LawyerSectionHeader('Actions'),
            if (a.canConfirm)
              FilledButton(
                onPressed: saving ? null : () => act('confirm', reload),
                child: const Text('Confirm Appointment'),
              ),
            if (a.canComplete)
              FilledButton(
                onPressed: saving ? null : () => act('complete', reload),
                child: const Text('Mark Completed'),
              ),
          ],
          if (saving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    ),
  );
}
