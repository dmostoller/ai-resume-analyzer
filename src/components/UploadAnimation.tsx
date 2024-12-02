import Lottie from 'lottie-react';
import scanningAnimation from '../animations/ai-icon-2.json';

interface UploadAnimationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadAnimation = ({ isOpen, onClose }: UploadAnimationProps) => {
  return (
    isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <>
            <Lottie animationData={scanningAnimation} loop={true} className="w-48 h-48 mx-auto" />
            <h2 className="text-xl font-semibold mb-2">Scanning Resume...</h2>
            <p className="text-gray-600">Your resume is being analyzed for ATS compatibility.</p>
          </>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  );
};
