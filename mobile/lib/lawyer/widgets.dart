import 'package:flutter/material.dart';
import '../services/api_client.dart';
import 'package:intl/intl.dart';
import 'design.dart';
import 'models.dart';

class ServerPanel<T> extends StatefulWidget {
  final Future<T> Function() load;
  final Widget Function(T data, VoidCallback reload) content;
  const ServerPanel({super.key, required this.load, required this.content});
  @override
  State<ServerPanel<T>> createState() => _ServerPanelState<T>();
}

class _ServerPanelState<T> extends State<ServerPanel<T>> {
  late Future<T> future;
  @override
  void initState() {
    super.initState();
    future = widget.load();
  }

  void reload() {
    if (mounted) setState(() => future = widget.load());
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: future,
    builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) {
        return Center(
          child: Semantics(
            label: 'Loading lawyer information',
            child: const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Loading…'),
              ],
            ),
          ),
        );
      }
      if (snapshot.hasError) {
        return Center(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    snapshot.error is ApiException
                        ? (snapshot.error as ApiException).message
                        : 'Unable to load this information. Please try again.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(onPressed: reload, child: const Text('Retry')),
                ],
              ),
            ),
          ),
        );
      }
      return RefreshIndicator(
        onRefresh: () async {
          reload();
          try {
            await future;
          } catch (_) {}
        },
        child: widget.content(snapshot.data as T, reload),
      );
    },
  );
}

Future<void> showLawyerError(BuildContext context, Object error) async {
  if (!context.mounted) return;
  final api = error is ApiException ? error : null;
  final conflicts = api?.conflicts is List ? api!.conflicts as List : const [];
  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(
        api?.statusCode == 409
            ? 'Unable to save this change'
            : 'Unable to complete action',
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(api?.message ?? 'Please check your connection and try again.'),
            for (final c in conflicts)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text('${c['date']} · ${c['startTime']}–${c['endTime']}'),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('OK'),
        ),
      ],
    ),
  );
}

Widget emptyState(String title, String message) => Padding(
  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
  child: Column(
    children: [
      const Icon(
        Icons.event_available_outlined,
        size: 32,
        color: LawyerDesign.muted,
      ),
      const SizedBox(height: 12),
      Text(
        title,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
      const SizedBox(height: 8),
      Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(color: LawyerDesign.muted, height: 1.4),
      ),
    ],
  ),
);

class LawyerPage extends StatelessWidget {
  final String title;
  final Widget body;
  final Widget? bottomNavigationBar;
  final List<Widget>? actions;
  final bool automaticallyImplyLeading;
  const LawyerPage({
    super.key,
    required this.title,
    required this.body,
    this.bottomNavigationBar,
    this.actions,
    this.automaticallyImplyLeading = true,
  });
  @override
  Widget build(BuildContext context) => Theme(
    data: LawyerDesign.theme(Theme.of(context)),
    child: Scaffold(
      appBar: AppBar(
        title: Text(title, maxLines: 2),
        toolbarHeight:
            64 +
            (MediaQuery.textScalerOf(context).scale(22) - 22).clamp(0, 44) * 2,
        actions: actions,
        automaticallyImplyLeading: automaticallyImplyLeading,
      ),
      body: SafeArea(
        top: false,
        bottom: bottomNavigationBar == null,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720),
            child: body,
          ),
        ),
      ),
      bottomNavigationBar: bottomNavigationBar,
    ),
  );
}

class LawyerSectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;
  const LawyerSectionHeader(this.title, {super.key, this.action});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 12,
      runSpacing: 8,
      children: [
        Semantics(
          header: true,
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        ?action,
      ],
    ),
  );
}

class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip(this.status, {super.key});
  @override
  Widget build(BuildContext context) {
    final value = status.toLowerCase();
    final color = switch (value) {
      'completed' ||
      'confirmed' ||
      'active' ||
      'working' => LawyerDesign.success,
      'pending' ||
      'requested' ||
      'rescheduled' ||
      'pending approval' => LawyerDesign.warning,
      'cancelled' || 'rejected' || 'inactive' => LawyerDesign.error,
      _ => LawyerDesign.muted,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: .18)),
      ),
      child: Text(
        status,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class ProfileInfoRow extends StatelessWidget {
  final String label, value;
  const ProfileInfoRow(this.label, this.value, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        SelectableText(
          value.isEmpty ? 'Not recorded' : value,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    ),
  );
}

class ScheduleDayRow extends StatelessWidget {
  final LawyerWorkingDay day;
  const ScheduleDayRow(this.day, {super.key});
  @override
  Widget build(BuildContext context) {
    final name = weekdayNames[day.day];
    final hours = day.working
        ? '${shortTime(day.start)} – ${shortTime(day.end)}'
        : '—';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact =
              constraints.maxWidth < 260 ||
              MediaQuery.textScalerOf(context).scale(14) > 19;
          final label = Semantics(
            label: name,
            excludeSemantics: true,
            child: Text(
              name.substring(0, 3).toUpperCase(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: LawyerDesign.muted,
              ),
            ),
          );
          final state = StatusChip(day.working ? 'Working' : 'Off');
          return compact
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: label),
                        state,
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(hours),
                  ],
                )
              : Row(
                  children: [
                    SizedBox(width: 44, child: label),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        hours,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(width: 8),
                    state,
                  ],
                );
        },
      ),
    );
  }
}

class LeaveCard extends StatelessWidget {
  final LawyerUnavailability leave;
  final VoidCallback onEdit, onDelete;
  const LeaveCard({
    super.key,
    required this.leave,
    required this.onEdit,
    required this.onDelete,
  });
  @override
  Widget build(BuildContext context) {
    final lastDay = leave.fullDay
        ? leave.end.subtract(const Duration(days: 1))
        : leave.end;
    final days =
        DateTime(lastDay.year, lastDay.month, lastDay.day)
            .difference(
              DateTime(leave.start.year, leave.start.month, leave.start.day),
            )
            .inDays +
        1;
    final sameDay = DateUtils.isSameDay(leave.start, lastDay);
    final date = sameDay
        ? DateFormat('d MMM yyyy').format(leave.start)
        : '${DateFormat('d MMM yyyy').format(leave.start)} – ${DateFormat('d MMM yyyy').format(lastDay)}';
    final period = leave.fullDay
        ? days == 1
              ? 'Full Day'
              : '$days Days'
        : '${DateFormat('HH:mm').format(leave.start)} – ${DateFormat('HH:mm').format(leave.end)}';
    final reason = cleanLawyerText(leave.reason);
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              period.toUpperCase(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: LawyerDesign.muted,
              ),
            ),
            const SizedBox(height: 4),
            Text(date, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Text(
              reason.isEmpty ? 'Unavailable for appointments' : reason,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            Wrap(
              spacing: 8,
              children: [
                TextButton(onPressed: onEdit, child: const Text('Edit')),
                TextButton(
                  onPressed: onDelete,
                  style: TextButton.styleFrom(
                    foregroundColor: LawyerDesign.error,
                  ),
                  child: const Text('Delete'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
