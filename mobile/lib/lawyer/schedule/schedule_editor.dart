import 'package:flutter/material.dart';
import '../models.dart';
import '../lawyer_api.dart';
import '../widgets.dart';
import '../design.dart';

class ScheduleEditor extends StatefulWidget {
  final LawyerSchedule schedule;
  const ScheduleEditor({super.key, required this.schedule});
  @override
  State<ScheduleEditor> createState() => _ScheduleEditorState();
}

class _ScheduleEditorState extends State<ScheduleEditor> {
  late final LawyerSchedule draft;
  late final TextEditingController duration;
  bool saving = false;
  @override
  void initState() {
    super.initState();
    draft = LawyerSchedule.fromJson({
      ...widget.schedule.toJson(),
      'timeZone': widget.schedule.timeZone,
      'hasConfiguredSchedule': widget.schedule.configured,
    });
    duration = TextEditingController(text: '${draft.duration}');
  }

  @override
  void dispose() {
    duration.dispose();
    super.dispose();
  }

  Future<void> pick(LawyerWorkingDay day, bool start) async {
    final text = (start ? day.start : day.end).split(':');
    final selected = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(
        hour: int.parse(text[0]),
        minute: int.parse(text[1]),
      ),
    );
    if (selected == null || !mounted) return;
    final value =
        '${selected.hour.toString().padLeft(2, '0')}:${selected.minute.toString().padLeft(2, '0')}:00';
    setState(() {
      if (start) {
        day.start = value;
      } else {
        day.end = value;
      }
    });
  }

  Future<void> save() async {
    final minutes = int.tryParse(duration.text);
    if (minutes == null ||
        minutes < 15 ||
        minutes > 240 ||
        draft.days.any((d) => d.working && d.start.compareTo(d.end) >= 0)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Use a duration of 15–240 minutes and start before end.',
          ),
        ),
      );
      return;
    }
    draft.duration = minutes;
    setState(() => saving = true);
    try {
      await LawyerApi.saveSchedule(draft);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) await showLawyerError(context, e);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => LawyerPage(
    title: 'Edit Working Schedule',
    body: ListView(
      padding: LawyerDesign.pagePadding,
      children: [
        Text(
          'Office time · ${draft.timeZone}',
          style: const TextStyle(color: LawyerDesign.muted),
        ),
        const SizedBox(height: 8),
        const Text('Keep existing appointments within your working hours.'),
        const SizedBox(height: 16),
        for (final day in [
          ...draft.days,
        ]..sort((a, b) => ((a.day + 6) % 7).compareTo((b.day + 6) % 7)))
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    weekdayNames[day.day],
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  value: day.working,
                  onChanged: saving
                      ? null
                      : (value) => setState(() => day.working = value),
                ),
                if (day.working)
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      OutlinedButton(
                        onPressed: saving ? null : () => pick(day, true),
                        child: Text('Start Time · ${shortTime(day.start)}'),
                      ),
                      OutlinedButton(
                        onPressed: saving ? null : () => pick(day, false),
                        child: Text('End Time · ${shortTime(day.end)}'),
                      ),
                    ],
                  ),
                const SizedBox(height: 12),
                const Divider(height: 1),
              ],
            ),
          ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) => DropdownMenu<int>(
            controller: duration,
            width: constraints.maxWidth,
            enabled: !saving,
            requestFocusOnTap: true,
            enableSearch: false,
            keyboardType: TextInputType.number,
            initialSelection: draft.duration,
            label: const Text('Appointment duration (minutes)'),
            helperText: 'Choose a duration or enter 15–240 minutes.',
            dropdownMenuEntries: [
              for (final minutes in ({
                15,
                30,
                45,
                60,
                90,
                120,
                180,
                240,
                draft.duration,
              }.toList()..sort()))
                DropdownMenuEntry(value: minutes, label: '$minutes'),
            ],
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: saving ? null : save,
          child: Text(saving ? 'Saving…' : 'Save Schedule'),
        ),
      ],
    ),
  );
}
