// components/MessageInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, Image, Smile, Paperclip, X } from 'lucide-react';

const MessageInput = ({ onSend, onTyping, disabled = false, darkMode = false }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleTyping = (e) => {
    setMessage(e.target.value);
    
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 1000);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true
    }));
    setUploadedImages(prev => [...prev, ...newImages]);
    
    // Simulate upload (replace with actual upload)
    newImages.forEach(img => {
      setTimeout(() => {
        setUploadedImages(prev => prev.map(i => 
          i.preview === img.preview 
            ? { ...i, uploading: false, url: '/placeholder-url' }
            : i
        ));
      }, 1000);
    });
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!message.trim() && uploadedImages.length === 0) || disabled || isLoading) return;

    setIsLoading(true);
    const imageUrls = uploadedImages.filter(img => img.url).map(img => img.url);
    const success = await onSend(message, imageUrls);
    
    if (success) {
      setMessage('');
      setUploadedImages([]);
    }
    setIsLoading(false);
  };

  return (
    <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Image previews */}
      {uploadedImages.length > 0 && (
        <div className="flex gap-2 p-2 overflow-x-auto">
          {uploadedImages.map((img, idx) => (
            <div key={idx} className="relative flex-shrink-0">
              <img src={img.preview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
              {img.uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <Loader className="h-4 w-4 text-white animate-spin" />
                </div>
              )}
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2 p-4">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <Paperclip className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <Smile className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>
        
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          placeholder="Type a message..."
          disabled={disabled || isLoading}
          className={`flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500'
          }`}
        />
        
        <button
          type="submit"
          disabled={(!message.trim() && uploadedImages.length === 0) || disabled || isLoading}
          className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            (!message.trim() && uploadedImages.length === 0) || disabled || isLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};

export default MessageInput;