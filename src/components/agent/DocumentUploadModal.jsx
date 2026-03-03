import React, { useState } from 'react';
import { X } from 'lucide-react';

const DocumentUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    await onUpload(files);
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Verification Documents</h2>
          <p className="text-gray-500 mb-6">Please upload the required documents for agency verification</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {[
              { id: 'incorporation', label: 'Certificate of Incorporation', accept: '.pdf,.jpg,.png' },
              { id: 'license',       label: 'Travel Agency License',        accept: '.pdf,.jpg,.png' },
              { id: 'tax',           label: 'Tax Registration (KRAPIN)',     accept: '.pdf,.jpg,.png' },
              { id: 'directorId',    label: 'Director ID/Passport',          accept: '.pdf,.jpg,.png' },
            ].map((doc) => (
              <div
                key={doc.id}
                className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{doc.label}</h4>
                    <p className="text-xs text-gray-500 mt-1">Accepted: PDF, JPG, PNG (Max 10MB)</p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept={doc.accept}
                      onChange={(e) => handleFileChange(e, doc.id)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required={!files[doc.id]}
                    />
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        files[doc.id]
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {files[doc.id] ? 'Uploaded ✓' : 'Choose File'}
                    </button>
                  </div>
                </div>
                {files[doc.id] && (
                  <p className="text-xs text-green-600 mt-2">{files[doc.id].name}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={uploading || Object.keys(files).length < 4}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Submit for Verification'}
            </button>

            <p className="text-xs text-center text-gray-500">
              Documents will be reviewed within 24-48 hours. You'll receive an email notification once verified.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;