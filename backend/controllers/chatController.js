const Chat = require('../model/Chat');

exports.saveChat = async (req, res) => {
    try {
        const { chatId, title, messages } = req.body;
        const userId = req.user._id;

        // Handle temporary chat IDs
        const finalChatId = chatId.startsWith('temp_') 
            ? `chat_${Date.now()}` 
            : chatId;

        if (!messages?.length) {
            return res.status(400).json({
                success: false,
                error: 'No messages to save'
            });
        }

        const chat = await Chat.updateWithMessages(userId, finalChatId, messages, title);

        res.json({ 
            success: true, 
            chat: {
                id: chat.chatId,
                title: chat.title,
                messages: chat.messages,
                lastUpdated: chat.lastUpdated
            } 
        });
    } catch (error) {
        console.error('Save chat error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        // Don't try to fetch new chats from database
        if (chatId.startsWith('new_')) {
            return res.json({ 
                success: true, 
                chat: {
                    chatId,
                    title: 'New Chat',
                    messages: [],
                    lastUpdated: new Date()
                }
            });
        }

        const chat = await Chat.findOne({ chatId, userId });
        
        if (!chat) {
            return res.status(404).json({ 
                success: false, 
                message: 'Chat not found' 
            });
        }

        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const chats = await Chat.find({ userId })
            .select('chatId title lastUpdated messages')
            .sort({ lastUpdated: -1 })
            .limit(50); // Limit to recent chats for performance

        res.json({ 
            success: true, 
            chats: chats.map(chat => ({
                id: chat.chatId,
                title: chat.title,
                lastUpdated: chat.lastUpdated,
                preview: chat.messages[chat.messages.length - 1]?.content || ''
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { title, messages } = req.body;
        const userId = req.user._id;

        if (!messages?.length) {
            return res.status(400).json({
                success: false,
                error: 'No messages to update'
            });
        }

        const chat = await Chat.updateWithMessages(userId, chatId, messages, title);

        if (!chat) {
            return res.status(404).json({
                success: false,
                error: 'Chat not found or unauthorized'
            });
        }

        res.json({
            success: true,
            chat: {
                id: chat.chatId,
                title: chat.title,
                messages: chat.messages,
                lastUpdated: chat.lastUpdated
            }
        });
    } catch (error) {
        console.error('Update chat error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}; 