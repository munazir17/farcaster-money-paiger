
import React, { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  DollarSign,
  Users,
  TrendingUp,
  Award,
  Zap,
  Gift,
  Copy,
  Check,
  Share2,
} from "lucide-react";

// Utility functions (same as your version)
const generateFid = () => Math.floor(Math.random() * 1000000);

const loadUserData = async (fid) => {
  const saved = localStorage.getItem(`moneyPaigerUser_${fid}`);
  return saved
    ? JSON.parse(saved)
    : {
        balance: 0,
        friends: 0,
        rank: "Bronze",
        streak: 0,
        lastClaim: null,
      };
};

const saveUserData = (fid, data) =>
  localStorage.setItem(`moneyPaigerUser_${fid}`, JSON.stringify(data));

const FarcasterMoneyPaiger = () => {
  const [user, setUser] = useState({
    fid: null,
    username: "Anon",
    pfpUrl: null,
    balance: 0,
    friends: 0,
    rank: "Bronze",
    streak: 0,
    lastClaim: null,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Initialize Mini App on mount
  useEffect(() => {
    initializeFarcasterApp();
  }, []);

  const initializeFarcasterApp = async () => {
    try {
      // Signal readiness to Farcaster
      sdk.actions.ready();

      // Try to get user context from Farcaster
      const context = await sdk.context.getCurrentUser();
      const fid = context?.fid || generateFid();
      const username = context?.username || "Anon";
      const pfpUrl = context?.pfpUrl || null;

      const userData = await loadUserData(fid);
      setUser({ ...userData, fid, username, pfpUrl });

      checkDailyReward(userData, fid);
      setLoading(false);
    } catch (error) {
      console.error("Init error:", error);
      const fallbackFid = generateFid();
      const userData = await loadUserData(fallbackFid);
      setUser({ ...userData, fid: fallbackFid });
      setLoading(false);
    }
  };

  const checkDailyReward = (userData, fid) => {
    const today = new Date().toDateString();
    if (userData.lastClaim !== today) {
      const newBalance = userData.balance + 5;
      const newStreak = userData.streak + 1;
      const newData = {
        ...userData,
        balance: newBalance,
        streak: newStreak,
        lastClaim: today,
      };
      saveUserData(fid, newData);
      setUser(newData);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(`https://warpcast.com/~/invite/${user.fid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading Money Paiger...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black text-white flex flex-col items-center p-4">
      <div className="text-center mt-6">
        {user.pfpUrl && (
          <img
            src={user.pfpUrl}
            alt="pfp"
            className="w-20 h-20 rounded-full mx-auto border-2 border-purple-400"
          />
        )}
        <h1 className="text-2xl font-bold mt-3">@{user.username}</h1>
        <p className="text-gray-400 text-sm">FID: {user.fid}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-md">
        <Card icon={<DollarSign />} label="Balance" value={`$${user.balance}`} />
        <Card icon={<Users />} label="Friends" value={user.friends} />
        <Card icon={<Award />} label="Rank" value={user.rank} />
        <Card icon={<Zap />} label="Streak" value={`${user.streak} days`} />
      </div>

      <button
        onClick={copyInvite}
        className="mt-6 bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-full flex items-center gap-2"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied!" : "Copy Invite Link"}
      </button>

      <button className="mt-4 bg-green-600 hover:bg-green-700 px-5 py-2 rounded-full flex items-center gap-2">
        <Gift size={16} />
        Claim Daily Reward
      </button>

      <button className="mt-4 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-full flex items-center gap-2">
        <Share2 size={16} />
        Share
      </button>

      <p className="text-xs text-gray-500 mt-8">Built for Farcaster 🚀</p>
    </div>
  );
};

const Card = ({ icon, label, value }) => (
  <div className="bg-white/10 rounded-2xl p-4 flex flex-col items-center">
    <div className="mb-2 text-purple-300">{icon}</div>
    <div className="text-sm text-gray-300">{label}</div>
    <div className="font-bold text-lg">{value}</div>
  </div>
);

export default FarcasterMoneyPaiger;
