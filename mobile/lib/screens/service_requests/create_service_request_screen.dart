import 'package:flutter/material.dart';

import '../../config/app_theme.dart';
import '../../models/service_request_chat_response.dart';
import '../../services/auth_service.dart';
import '../../services/service_request_chat_service.dart';
import '../../services/service_request_service.dart';

class CreateServiceRequestScreen extends StatefulWidget {
  const CreateServiceRequestScreen({super.key});

  @override
  State<CreateServiceRequestScreen> createState() =>
      _CreateServiceRequestScreenState();
}

class _CreateServiceRequestScreenState
    extends State<CreateServiceRequestScreen> {
  final TextEditingController _messageController =
      TextEditingController();

  final ScrollController _scrollController =
      ScrollController();

  final List<_ChatMessage> _messages = [];

  String? _sessionId;

  ServiceRequestDraft? _draft;

  bool _sending = false;
  bool _submitting = false;
  bool _readyToSubmit = false;

  @override
  void initState() {
    super.initState();

    _messages.add(
      const _ChatMessage(
        text:
            'Hello! I am the LegalEase AI Assistant.\n\n'
            'Tell me about the legal problem you are facing. '
            'You can explain it naturally in your own words.',
        isUser: false,
      ),
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();

    if (message.isEmpty || _sending || _submitting) {
      return;
    }

    setState(() {
      _messages.add(
        _ChatMessage(
          text: message,
          isUser: true,
        ),
      );

      _sending = true;
    });

    _messageController.clear();
    _scrollToBottom();

    try {
      final result =
          await ServiceRequestChatService.sendMessage(
        message: message,
        sessionId: _sessionId,
      );

      if (!mounted) return;

      setState(() {
        _sessionId = result.sessionId;
        _draft = result.draft;
        _readyToSubmit = result.isReadyToSubmit;

        _messages.add(
          _ChatMessage(
            text: result.reply,
            isUser: false,
          ),
        );
      });

      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _messages.add(
          _ChatMessage(
            text:
                'Sorry, I could not analyze your request.\n\n'
                'Please check your connection and try again.\n\n$e',
            isUser: false,
            isError: true,
          ),
        );
      });

      _scrollToBottom();
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }



Future<void> _confirmAndSubmit() async {
  final user = AuthService.currentUser.value;

  if (user == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Please sign in before submitting a legal request.',
        ),
      ),
    );
    return;
  }

  final draft = _draft;

  if (draft == null) {
    return;
  }

  final title = draft.title?.trim() ?? '';
  final description = draft.description?.trim() ?? '';
  final requestType = draft.requestType?.trim() ?? '';
  final priority = draft.priority?.trim() ?? 'Medium';

  if (title.isEmpty ||
      description.isEmpty ||
      requestType.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'The AI draft is incomplete. Please continue the conversation.',
        ),
      ),
    );
    return;
  }

  setState(() {
    _submitting = true;
  });

  try {
    final createdRequest =
        await ServiceRequestService.createRequest(
      customerId: int.parse(user.userId),
      title: title,
      description: description,
      requestType: requestType,
      priority: priority,
    );

    if (!mounted) return;

    setState(() {
      _readyToSubmit = false;

      _messages.add(
        _ChatMessage(
          text:
              'Your legal request has been submitted successfully.\n\n'
              'Request ID:\n'
              '${createdRequest.serviceRequestId}\n\n'
              'Your request is now ready for the legal AI workflow.',
          isUser: false,
        ),
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: Color(0xFF059669),
        content: Text(
          'Legal request submitted successfully.',
        ),
      ),
    );

    _scrollToBottom();
  } catch (e) {
    if (!mounted) return;

    setState(() {
      _messages.add(
        _ChatMessage(
          text:
              'I prepared the request, but it could not be submitted.\n\n$e',
          isUser: false,
          isError: true,
        ),
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFFDC2626),
        content: Text(
          'Failed to submit request: $e',
        ),
      ),
    );
  } finally {
    if (mounted) {
      setState(() {
        _submitting = false;
      });
    }
  }
}




  void _restartConversation() {
    setState(() {
      _sessionId = null;
      _draft = null;
      _readyToSubmit = false;
      _sending = false;

      _messages
        ..clear()
        ..add(
          const _ChatMessage(
            text:
                'Let us start again.\n\n'
                'Tell me about the legal problem you are facing.',
            isUser: false,
          ),
        );
    });

    _messageController.clear();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        if (!_scrollController.hasClients) return;

        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration:
              const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:
          const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor:
            AppTheme.primaryNavy,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Text(
              'AI Legal Assistant',
              style: TextStyle(
                fontSize: 16,
                fontWeight:
                    FontWeight.bold,
              ),
            ),
            Text(
              'Planning & Coordinator Agent',
              style: TextStyle(
                fontSize: 10,
                color: Colors.white70,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'New conversation',
            onPressed:
                _submitting
                    ? null
                    : _restartConversation,
            icon: const Icon(
              Icons.refresh_rounded,
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildAgentHeader(),

          Expanded(
            child: ListView.builder(
              controller:
                  _scrollController,
              padding:
                  const EdgeInsets.all(16),
              itemCount:
                  _messages.length +
                      (_readyToSubmit &&
                              _draft != null
                          ? 1
                          : 0),
              itemBuilder:
                  (context, index) {
                if (_readyToSubmit &&
                    _draft != null &&
                    index ==
                        _messages.length) {
                  return _buildDraftCard();
                }

                return _buildMessageBubble(
                  _messages[index],
                );
              },
            ),
          ),

          if (_sending)
            const Padding(
              padding:
                  EdgeInsets.only(
                left: 18,
                right: 18,
                bottom: 8,
              ),
              child: Align(
                alignment:
                    Alignment.centerLeft,
                child: _TypingIndicator(),
              ),
            ),

          if (!_readyToSubmit)
            _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildAgentHeader() {
    return Container(
      width: double.infinity,
      padding:
          const EdgeInsets.symmetric(
        horizontal: 18,
        vertical: 13,
      ),
      color: AppTheme.primaryNavy,
      child: Row(
        children: [
          Stack(
            children: [
              Container(
                width: 43,
                height: 43,
                decoration:
                    BoxDecoration(
                  color: AppTheme.gold
                      .withValues(
                    alpha: 0.16,
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppTheme.gold,
                  ),
                ),
                child: const Icon(
                  Icons
                      .auto_awesome_rounded,
                  color: AppTheme.gold,
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 11,
                  height: 11,
                  decoration:
                      BoxDecoration(
                    color: const Color(
                      0xFF22C55E,
                    ),
                    shape:
                        BoxShape.circle,
                    border: Border.all(
                      color: AppTheme
                          .primaryNavy,
                      width: 2,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 11),
          const Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment
                      .start,
              children: [
                Text(
                  'LegalEase Coordinator',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight:
                        FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Describe your legal issue naturally',
                  style: TextStyle(
                    color:
                        Color(0xFFCBD5E1),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets
                    .symmetric(
              horizontal: 8,
              vertical: 4,
            ),
            decoration:
                BoxDecoration(
              color: const Color(
                0xFF22C55E,
              ).withValues(
                alpha: 0.15,
              ),
              borderRadius:
                  BorderRadius.circular(
                15,
              ),
            ),
            child: const Text(
              'ONLINE',
              style: TextStyle(
                color:
                    Color(0xFF86EFAC),
                fontSize: 9,
                fontWeight:
                    FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(
    _ChatMessage message,
  ) {
    return Align(
      alignment: message.isUser
          ? Alignment.centerRight
          : Alignment.centerLeft,
      child: Container(
        constraints:
            BoxConstraints(
          maxWidth:
              MediaQuery.of(context)
                      .size
                      .width *
                  0.80,
        ),
        margin:
            const EdgeInsets.only(
          bottom: 12,
        ),
        padding:
            const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 11,
        ),
        decoration:
            BoxDecoration(
          color: message.isUser
              ? const Color(
                  0xFF7C3AED,
                )
              : message.isError
                  ? const Color(
                      0xFFFEF2F2,
                    )
                  : Colors.white,
          borderRadius:
              BorderRadius.only(
            topLeft:
                const Radius.circular(
              18,
            ),
            topRight:
                const Radius.circular(
              18,
            ),
            bottomLeft:
                Radius.circular(
              message.isUser
                  ? 18
                  : 4,
            ),
            bottomRight:
                Radius.circular(
              message.isUser
                  ? 4
                  : 18,
            ),
          ),
          border: message.isUser
              ? null
              : Border.all(
                  color:
                      message.isError
                          ? const Color(
                              0xFFFECACA,
                            )
                          : const Color(
                              0xFFE2E8F0,
                            ),
                ),
        ),
        child: Text(
          message.text,
          style: TextStyle(
            color: message.isUser
                ? Colors.white
                : message.isError
                    ? const Color(
                        0xFF991B1B,
                      )
                    : const Color(
                        0xFF334155,
                      ),
            fontSize: 13,
            height: 1.45,
          ),
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return SafeArea(
      top: false,
      child: Container(
        padding:
            const EdgeInsets.fromLTRB(
          12,
          9,
          12,
          9,
        ),
        decoration:
            const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(
              color:
                  Color(0xFFE2E8F0),
            ),
          ),
        ),
        child: Row(
          crossAxisAlignment:
              CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller:
                    _messageController,
                enabled:
                    !_sending &&
                        !_submitting,
                minLines: 1,
                maxLines: 5,
                textCapitalization:
                    TextCapitalization
                        .sentences,
                decoration:
                    InputDecoration(
                  hintText:
                      'Describe your legal problem...',
                  filled: true,
                  fillColor:
                      const Color(
                    0xFFF8FAFC,
                  ),
                  border:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius
                            .circular(22),
                    borderSide:
                        const BorderSide(
                      color: Color(
                        0xFFE2E8F0,
                      ),
                    ),
                  ),
                  enabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius
                            .circular(22),
                    borderSide:
                        const BorderSide(
                      color: Color(
                        0xFFE2E8F0,
                      ),
                    ),
                  ),
                  contentPadding:
                      const EdgeInsets
                          .symmetric(
                    horizontal: 16,
                    vertical: 11,
                  ),
                ),
                onSubmitted: (_) {
                  _sendMessage();
                },
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration:
                  const BoxDecoration(
                color:
                    Color(0xFF7C3AED),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                onPressed:
                    _sending ||
                            _submitting
                        ? null
                        : _sendMessage,
                icon: const Icon(
                  Icons.send_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDraftCard() {
    final draft = _draft!;

    return Container(
      margin:
          const EdgeInsets.only(
        top: 5,
        bottom: 25,
      ),
      padding:
          const EdgeInsets.all(17),
      decoration:
          BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.circular(18),
        border: Border.all(
          color:
              const Color(0xFFDDD6FE),
        ),
        boxShadow: [
          BoxShadow(
            color:
                const Color(
                  0xFF7C3AED,
                ).withValues(
                  alpha: 0.08,
                ),
            blurRadius: 12,
            offset:
                const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons
                    .auto_awesome_rounded,
                color:
                    Color(0xFF7C3AED),
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'AI Prepared Request',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight:
                        FontWeight.bold,
                    color: AppTheme
                        .primaryNavy,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          _summaryRow(
            'Title',
            draft.title,
          ),

          _summaryRow(
            'Legal Category',
            draft.legalCategory,
          ),

          _summaryRow(
            'Request Type',
            draft.requestType,
          ),

          _summaryRow(
            'Priority',
            draft.priority,
          ),

          _summaryRow(
            'Description',
            draft.description,
          ),

          const SizedBox(height: 10),

          Container(
            width: double.infinity,
            padding:
                const EdgeInsets.all(
              11,
            ),
            decoration:
                BoxDecoration(
              color:
                  const Color(
                    0xFFEFF6FF,
                  ),
              borderRadius:
                  BorderRadius
                      .circular(10),
            ),
            child: const Text(
              'Please review the information carefully. '
              'The request will only be created after you confirm.',
              style: TextStyle(
                fontSize: 11,
                height: 1.4,
                color:
                    Color(0xFF1E40AF),
              ),
            ),
          ),

          const SizedBox(height: 15),

          Row(
            children: [
              Expanded(
                child:
                    OutlinedButton.icon(
                  onPressed:
                      _submitting
                          ? null
                          : _restartConversation,
                  icon: const Icon(
                    Icons
                        .restart_alt_rounded,
                  ),
                  label:
                      const Text(
                    'Start Again',
                  ),
                ),
              ),

              const SizedBox(width: 9),

              Expanded(
                flex: 2,
                child:
                    ElevatedButton.icon(
                  onPressed:
                      _submitting
                          ? null
                          : _confirmAndSubmit,
                  style:
                      ElevatedButton
                          .styleFrom(
                    backgroundColor:
                        const Color(
                      0xFF7C3AED,
                    ),
                    foregroundColor:
                        Colors.white,
                    padding:
                        const EdgeInsets
                            .symmetric(
                      vertical: 13,
                    ),
                  ),
                  icon:
                      _submitting
                          ? const SizedBox(
                              width: 17,
                              height: 17,
                              child:
                                  CircularProgressIndicator(
                                strokeWidth:
                                    2,
                                color:
                                    Colors.white,
                              ),
                            )
                          : const Icon(
                              Icons
                                  .check_circle_outline,
                            ),
                  label: Text(
                    _submitting
                        ? 'Submitting...'
                        : 'Confirm & Submit',
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(
    String label,
    String? value,
  ) {
    final displayValue =
        value?.trim().isNotEmpty == true
            ? value!
            : 'Not detected';

    return Padding(
      padding:
          const EdgeInsets.only(
        bottom: 12,
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color:
                  Color(0xFF94A3B8),
              fontSize: 9,
              letterSpacing: 0.7,
              fontWeight:
                  FontWeight.bold,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            displayValue,
            style: const TextStyle(
              color:
                  Color(0xFF334155),
              fontSize: 13,
              fontWeight:
                  FontWeight.w600,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatMessage {
  final String text;
  final bool isUser;
  final bool isError;

  const _ChatMessage({
    required this.text,
    required this.isUser,
    this.isError = false,
  });
}

class _TypingIndicator
    extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 10,
      ),
      decoration:
          BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.circular(16),
        border: Border.all(
          color:
              const Color(0xFFE2E8F0),
        ),
      ),
      child: const Row(
        mainAxisSize:
            MainAxisSize.min,
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child:
                CircularProgressIndicator(
              strokeWidth: 2,
            ),
          ),
          SizedBox(width: 9),
          Text(
            'Analyzing your request...',
            style: TextStyle(
              fontSize: 11,
              color:
                  Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}