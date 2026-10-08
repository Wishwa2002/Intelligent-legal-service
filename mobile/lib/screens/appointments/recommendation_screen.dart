import 'package:flutter/material.dart';
import '../../services/api_client.dart';

/// Staff-only view of the same backend workflow used by the React admin page.
class RecommendationScreen extends StatefulWidget {
  const RecommendationScreen({super.key});
  @override
  State<RecommendationScreen> createState() => _RecommendationScreenState();
}

class _RecommendationScreenState extends State<RecommendationScreen> {
  final _requirement = TextEditingController();
  final _customerId = TextEditingController();
  DateTime? _date;
  Map<String, dynamic>? _workflow;
  List<Map<String, dynamic>> _slots = [];
  String? _lawyerId;
  String? _slotId;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _requirement.dispose();
    _customerId.dispose();
    super.dispose();
  }

  String get _dateText => _date == null ? '' : _date!.toIso8601String().substring(0, 10);

  Future<void> _find() async {
    if (_requirement.text.trim().length < 3) return;
    setState(() { _busy = true; _error = null; _workflow = null; _slots = []; _lawyerId = null; });
    try {
      final data = await ApiClient.post('/api/lawyer-recommendations', {
        'requirement': _requirement.text.trim(), 'date': _dateText.isEmpty ? null : _dateText, 'limit': 5,
      });
      if (mounted) setState(() => _workflow = Map<String, dynamic>.from(data as Map));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally { if (mounted) setState(() => _busy = false); }
  }

  Future<void> _loadSlots() async {
    if (_lawyerId == null || _dateText.isEmpty) return;
    setState(() { _busy = true; _error = null; _slots = []; _slotId = null; });
    try {
      final data = await ApiClient.get('/api/appointments/available-slots',
          queryParams: {'lawyerId': _lawyerId!, 'date': _dateText});
      if (mounted) {
        setState(() => _slots = (data as List)
            .map((item) => Map<String, dynamic>.from(item as Map))
            .where((item) => item['isBooked'] != true).toList());
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally { if (mounted) setState(() => _busy = false); }
  }

  Future<void> _approve() async {
    if (_workflow == null || _lawyerId == null || _slotId == null || _customerId.text.trim().isEmpty) return;
    setState(() { _busy = true; _error = null; });
    try {
      final data = await ApiClient.post(
        '/api/lawyer-recommendations/${_workflow!['workflowId']}/approve',
        {'lawyerId': _lawyerId, 'slotId': _slotId, 'customerId': _customerId.text.trim()},
      );
      if (mounted) setState(() => _workflow = Map<String, dynamic>.from(data as Map));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally { if (mounted) setState(() => _busy = false); }
  }

  @override
  Widget build(BuildContext context) {
    final recommendations = (_workflow?['recommendations'] as List?) ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Lawyer Recommendation Agent')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Describe a legal issue. Gemini classifies it; only real active lawyers are recommended.'),
        const SizedBox(height: 12),
        TextField(controller: _requirement, minLines: 2, maxLines: 4,
            decoration: const InputDecoration(labelText: 'Legal requirement', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        OutlinedButton.icon(onPressed: _busy ? null : () async {
          final picked = await showDatePicker(context: context, initialDate: DateTime.now(),
              firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)));
          if (picked != null) {
            setState(() => _date = picked);
          }
        }, icon: const Icon(Icons.calendar_today), label: Text(_dateText.isEmpty ? 'Optional date' : _dateText)),
        ElevatedButton(onPressed: _busy ? null : _find, child: const Text('Get recommendations')),
        if (_busy) const Center(child: CircularProgressIndicator()),
        if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
        if (_workflow != null) ...[
          Text('Status: ${_workflow!['status']}', style: const TextStyle(fontWeight: FontWeight.bold)),
          for (final warning in (_workflow!['warnings'] as List? ?? [])) Text(warning.toString()),
          if (recommendations.isEmpty) const Text('No eligible lawyers matched.'),
          RadioGroup<String>(
            groupValue: _lawyerId,
            onChanged: (value) {
              if (_workflow!['status'] != 'AWAITING_APPROVAL') {
                return;
              }
              setState(() { _lawyerId = value; _slots = []; _slotId = null; });
            },
            child: Column(children: [
              for (final value in recommendations) Builder(builder: (context) {
                final item = Map<String, dynamic>.from(value as Map);
                final id = item['lawyerId'].toString();
                return Card(child: ListTile(
                  title: Text('Lawyer $id · score ${item['score']}'),
                  subtitle: Text(item['reason']?.toString() ?? ''),
                  trailing: _workflow!['status'] == 'AWAITING_APPROVAL'
                      ? Radio<String>(value: id)
                      : null,
                ));
              }),
            ]),
          ),
          if (_workflow!['status'] == 'AWAITING_APPROVAL' && _lawyerId != null) ...[
            const SizedBox(height: 12),
            const Text('Select a customer and an available slot to approve and book.'),
            TextField(controller: _customerId,
                decoration: const InputDecoration(labelText: 'Customer UUID (from appointment system)')),
            OutlinedButton(onPressed: _busy ? null : _loadSlots,
                child: const Text('Load available slots for selected date')),
            DropdownButton<String>(value: _slotId, hint: const Text('Choose a slot'),
              items: _slots.map((s) => DropdownMenuItem<String>(value: s['slotId'].toString(),
                child: Text('${s['startTime']}–${s['endTime']}'))).toList(),
              onChanged: (value) => setState(() => _slotId = value)),
            ElevatedButton(onPressed: _busy || _slotId == null ? null : _approve,
                child: const Text('Approve and book')),
          ],
          if (_workflow!['status'] == 'ACTION_COMPLETED')
            Text('Booking created: ${_workflow!['appointmentId']}'),
        ],
      ]),
    );
  }
}
