import 'package:flutter/material.dart';
import '../lawyer_api.dart';
import '../models.dart';
import '../widgets.dart';
import '../design.dart';
import 'schedule_editor.dart';
import 'unavailability_editor.dart';

class LawyerScheduleScreen extends StatelessWidget {
  final VoidCallback onChanged;
  const LawyerScheduleScreen({super.key, required this.onChanged});
  Future<(LawyerSchedule, List<LawyerUnavailability>)> load() async {
    final values = await Future.wait<Object>([
      LawyerApi.schedule(),
      LawyerApi.leave(),
    ]);
    return (
      values[0] as LawyerSchedule,
      values[1] as List<LawyerUnavailability>,
    );
  }

  Future<void> delete(
    BuildContext context,
    LawyerUnavailability leave,
    VoidCallback reload,
  ) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete this unavailability?'),
        content: const Text(
          'This time will become available for appointments again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Back'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: LawyerDesign.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await LawyerApi.deleteLeave(leave.id);
      reload();
    } catch (e) {
      if (context.mounted) await showLawyerError(context, e);
    }
  }

  @override
  Widget build(
    BuildContext context,
  ) => ServerPanel<(LawyerSchedule, List<LawyerUnavailability>)>(
    load: load,
    content: (data, reload) {
      final schedule = data.$1;
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: LawyerDesign.pagePadding,
        children: [
          const LawyerSectionHeader('Weekly Working Schedule'),
          Text(
            'Office time · ${schedule.timeZone}',
            style: const TextStyle(color: LawyerDesign.muted),
          ),
          const SizedBox(height: 16),
          if (!schedule.configured)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Text(
                'No schedule configured. Review and save working hours to enable booking.',
              ),
            ),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(
                children: [
                  for (final day
                      in [...schedule.days]..sort(
                        (a, b) => ((a.day + 6) % 7).compareTo((b.day + 6) % 7),
                      ))
                    ScheduleDayRow(day),
                ],
              ),
            ),
          ),
          Text(
            'Appointment duration · ${schedule.duration} min',
            style: const TextStyle(color: LawyerDesign.muted),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ScheduleEditor(schedule: schedule),
                  ),
                );
                reload();
              },
              child: const Text('Edit Working Schedule'),
            ),
          ),
          const SizedBox(height: 24),
          LawyerSectionHeader(
            'Leave & Unavailability',
            action: TextButton.icon(
              onPressed: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const UnavailabilityEditor(),
                  ),
                );
                reload();
              },
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add Unavailability'),
            ),
          ),
          if (data.$2.isEmpty)
            emptyState(
              'No upcoming leave',
              'Add leave when you will be unavailable for appointments.',
            ),
          for (final leave in data.$2)
            LeaveCard(
              leave: leave,
              onEdit: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => UnavailabilityEditor(leave: leave),
                  ),
                );
                reload();
              },
              onDelete: () => delete(context, leave, reload),
            ),
        ],
      );
    },
  );
}
