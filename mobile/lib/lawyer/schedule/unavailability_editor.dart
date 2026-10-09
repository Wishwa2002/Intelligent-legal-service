import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models.dart';
import '../lawyer_api.dart';
import '../widgets.dart';
import '../design.dart';

class UnavailabilityEditor extends StatefulWidget {
  final LawyerUnavailability? leave;
  const UnavailabilityEditor({super.key, this.leave});
  @override
  State<UnavailabilityEditor> createState() => _UnavailabilityEditorState();
}

class _UnavailabilityEditorState extends State<UnavailabilityEditor> {
  late DateTime start, end;
  late bool fullDay;
  late final TextEditingController reason;
  bool saving = false;
  @override
  void initState() {
    super.initState();
    final now = officeNow();
    start = widget.leave?.start ?? DateTime(now.year, now.month, now.day + 1);
    end = widget.leave?.end ?? start.add(const Duration(days: 1));
    fullDay = widget.leave?.fullDay ?? true;
    reason = TextEditingController(
      text: cleanLawyerText(widget.leave?.reason ?? ''),
    );
  }

  @override
  void dispose() {
    reason.dispose();
    super.dispose();
  }

  DateTime get shownEnd =>
      fullDay ? end.subtract(const Duration(days: 1)) : end;
  Future<void> pickDate(bool isStart) async {
    final current = isStart ? start : shownEnd;
    final date = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (date == null || !mounted) return;
    var value = DateTime(
      date.year,
      date.month,
      date.day,
      fullDay ? 0 : current.hour,
      fullDay ? 0 : current.minute,
    );
    if (fullDay && !isStart) value = value.add(const Duration(days: 1));
    setState(() {
      if (isStart) {
        start = value;
      } else {
        end = value;
      }
    });
  }

  Future<void> pickTime(bool isStart) async {
    final current = isStart ? start : end;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(current),
    );
    if (time == null || !mounted) return;
    final value = DateTime(
      current.year,
      current.month,
      current.day,
      time.hour,
      time.minute,
    );
    setState(() {
      if (isStart) {
        start = value;
      } else {
        end = value;
      }
    });
  }

  Future<void> save() async {
    if (!start.isBefore(end) || reason.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Choose an end after the start and enter a reason.'),
        ),
      );
      return;
    }
    setState(() => saving = true);
    try {
      await LawyerApi.saveLeave(widget.leave?.id, {
        'startDateTime': start.toIso8601String(),
        'endDateTime': end.toIso8601String(),
        // Preserve legacy seed markers internally when an existing record is edited.
        'reason': preserveSchedulingMarker(
          widget.leave?.reason ?? '',
          reason.text,
        ),
        'isFullDay': fullDay,
      });
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) await showLawyerError(context, e);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Widget field(String label, String value, VoidCallback action) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: OutlinedButton(
      onPressed: saving ? null : action,
      child: Align(
        alignment: Alignment.centerLeft,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: LawyerDesign.muted),
            ),
            const SizedBox(height: 4),
            Text(value),
          ],
        ),
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => LawyerPage(
    title: widget.leave == null ? 'Add Unavailability' : 'Edit Unavailability',
    body: ListView(
      padding: LawyerDesign.pagePadding,
      children: [
        const Text(
          'Block time when you cannot take appointments. Existing appointments must be resolved first.',
          style: TextStyle(color: LawyerDesign.muted),
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Full Day'),
          value: fullDay,
          onChanged: saving
              ? null
              : (value) => setState(() {
                  final last = shownEnd;
                  fullDay = value;
                  if (value) {
                    start = DateUtils.dateOnly(start);
                    end = DateUtils.dateOnly(last).add(const Duration(days: 1));
                    if (!end.isAfter(start)) {
                      end = start.add(const Duration(days: 1));
                    }
                  }
                }),
        ),
        const SizedBox(height: 12),
        field(
          'Start date',
          DateFormat('d MMM yyyy').format(start),
          () => pickDate(true),
        ),
        if (!fullDay)
          field(
            'Start time',
            DateFormat('HH:mm').format(start),
            () => pickTime(true),
          ),
        field(
          'End date',
          DateFormat('d MMM yyyy').format(shownEnd),
          () => pickDate(false),
        ),
        if (!fullDay)
          field(
            'End time',
            DateFormat('HH:mm').format(end),
            () => pickTime(false),
          ),
        const SizedBox(height: 4),
        TextField(
          controller: reason,
          enabled: !saving,
          maxLength: 300 - schedulingMarkerLength(widget.leave?.reason ?? ''),
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Reason'),
        ),
        const SizedBox(height: 12),
        Text(
          fullDay
              ? 'Full day · ${DateFormat('d MMM yyyy').format(start)}${DateUtils.isSameDay(start, shownEnd) ? '' : ' – ${DateFormat('d MMM yyyy').format(shownEnd)}'}'
              : '${DateFormat('HH:mm').format(start)} – ${DateFormat('HH:mm').format(end)} · ${DateFormat('d MMM yyyy').format(start)}${DateUtils.isSameDay(start, end) ? '' : ' – ${DateFormat('d MMM yyyy').format(end)}'}',
          style: const TextStyle(color: LawyerDesign.muted),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: saving ? null : save,
          child: Text(saving ? 'Saving…' : 'Save Unavailability'),
        ),
      ],
    ),
  );
}
