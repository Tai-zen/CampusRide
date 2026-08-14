import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AlertTriangle } from 'lucide-react';

interface ComplaintFormProps {
  rideId?: string;
  passengerId: string;
  passengerName: string;
  passengerAvatar?: string;
  driverId?: string;
  driverName?: string;
  onComplaintSubmitted?: () => void;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({
  rideId = 'N/A',
  passengerId,
  passengerName,
  passengerAvatar,
  driverId = 'N/A',
  driverName = 'David Alao',
  onComplaintSubmitted
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('Driver Behavior');
  const [details, setDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg('');
    try {
      const complaintId = `COMP-${Date.now()}`;
      const newComplaint = {
        id: complaintId,
        rideId: rideId || 'N/A',
        passengerId: passengerId || 'unknown',
        passengerName: passengerName || 'Student Companion',
        passengerAvatar: passengerAvatar || '',
        driverId: driverId || 'N/A',
        driverName: driverName || 'David Alao',
        category: category,
        details: details.trim(),
        status: 'pending',
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'complaints', complaintId), newComplaint);
      setSuccessMsg('Your complaint has been logged and sent to the admin team for immediate review.');
      setDetails('');
      if (onComplaintSubmitted) {
        onComplaintSubmitted();
      }
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error('Error submitting complaint:', err);
      alert('Failed to submit complaint. Please check your network connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-150 pt-4 text-left">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-250 py-3 px-4 rounded-2xl transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
          File An On-Trip Complaint
        </button>
      ) : (
        <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4 text-left space-y-3.5">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2">
            <span className="text-xs font-black text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Lodge Active Trip Dispute
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {successMsg ? (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-xl border border-emerald-200 animate-pulse">
              {successMsg}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-850 uppercase tracking-wider font-mono">Dispute Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500 outline-none font-bold text-slate-700"
                >
                  <option value="Driver Behavior">Unprofessional Driver Behavior</option>
                  <option value="Dangerous Driving">Dangerous Driving or Speeding</option>
                  <option value="Route Deviation">Incorrect or Unauthorized Route Deviation</option>
                  <option value="Vehicle Condition">Unsanitary or Damaged Vehicle Condition</option>
                  <option value="Overcharging Dispute">Fare Dispute / Overcharging</option>
                  <option value="Other">Other Operational Safety Concerns</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-rose-850 uppercase tracking-wider font-mono">Incident Details</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide specific details about what is happening on this ride. This is sent directly to administrators in real time."
                  rows={3}
                  className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 outline-none text-slate-700 placeholder-slate-400 leading-relaxed font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !details.trim()}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl shadow-md shadow-rose-900/10 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-mono"
              >
                {isSubmitting ? 'Submitting Dispute...' : 'Transmit Dispute to Admin'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
