import 'package:flutter/material.dart';
import '../models.dart';
import '../lawyer_api.dart';
import '../widgets.dart';
import '../design.dart';
import '../appointments/appointment_card.dart';
import '../appointments/lawyer_appointment_detail_screen.dart';

class LawyerDashboardScreen extends StatelessWidget {
  final VoidCallback onToday, onChanged;
  const LawyerDashboardScreen({
    super.key,
    required this.onToday,
    required this.onChanged,
  });
  Future<(LawyerDashboardSummary, List<LawyerAppointment>)> load() async {
    final results = await Future.wait<Object>([
      LawyerApi.dashboard(),
      LawyerApi.appointments('today'),
    ]);
    return (
      results[0] as LawyerDashboardSummary,
      results[1] as List<LawyerAppointment>,
    );
  }

  @override
  Widget build(
    BuildContext context,
  ) => ServerPanel<(LawyerDashboardSummary, List<LawyerAppointment>)>(
    load: load,
    content: (result, reload) {
      final data = result.$1, today = result.$2;
      final hour = officeNow().hour;
      final greeting = hour < 12
          ? 'Good morning'
          : hour < 17
          ? 'Good afternoon'
          : 'Good evening';
      void open(LawyerAppointment appointment) async {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => LawyerAppointmentDetailScreen(id: appointment.id),
          ),
        );
        reload();
      }

      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: LawyerDesign.pagePadding,
        children: [
          Text(
            '$greeting, ${data.lawyer.name.trim().split(RegExp(r'\s+')).first}',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Text(
            data.lawyer.practiceArea,
            style: const TextStyle(color: LawyerDesign.muted),
          ),
          const SizedBox(height: 24),
          LawyerSectionHeader(
            'TODAY',
            action: TextButton(
              onPressed: onToday,
              child: const Text('View Today'),
            ),
          ),
          Text(
            data.today == 0
                ? 'No appointments today'
                : '${data.today} ${data.today == 1 ? 'appointment' : 'appointments'} today',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          if (today.isEmpty)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text(
                'Your scheduled consultations for today will appear here.',
                style: TextStyle(color: LawyerDesign.muted),
              ),
            ),
          for (final appointment in today.take(3))
            AppointmentCard(
              appointment: appointment,
              onTap: () => open(appointment),
            ),
          if (today.length > 3)
            TextButton(
              onPressed: onToday,
              child: Text('View all ${today.length} appointments today'),
            ),
          const SizedBox(height: 24),
          const LawyerSectionHeader('UP NEXT'),
          if (data.next == null)
            emptyState(
              'No upcoming appointment',
              'Your next scheduled consultation will appear here.',
            )
          else
            AppointmentCard(
              appointment: data.next!,
              upNext: true,
              onTap: () => open(data.next!),
            ),
          const SizedBox(height: 24),
          const LawyerSectionHeader('AT A GLANCE'),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final item in [
                ('Upcoming', data.upcoming),
                ('Pending', data.pending),
                ('Completed', data.completed),
              ])
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: LawyerDesign.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: LawyerDesign.border),
                  ),
                  child: Text(
                    '${item.$1}  ${item.$2}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: LawyerDesign.muted,
                    ),
                  ),
                ),
            ],
          ),
        ],
      );
    },
  );
}
