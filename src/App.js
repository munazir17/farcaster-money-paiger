import React, { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, Award, Zap, Gift, Copy, Check, Share2 } from 'lucide-react';

export default function FarcasterMoneyPaiger() {
  const [user, setUser] = useState({
    fid: null,
    username: 'Anon',
    pfpUrl: null,
    balance: 0,
    level: 1,
    xp: 0,
    energy: 100,
    totalEarned: 0,
    referrals: 0,
    completedTasks: [],
    casts: 0
  });

  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [activeTab, setActiveTab] = useState('earn');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [shareText, setShareText] = useState('');

  useEffect(() => {
    initializeFarcasterApp();
  }, []);

  useEffect(() => {
    const energyTimer = setInterval(() => {
      setUser(prev => {
        if (prev.energy < 100) {
          const newUser = { ...prev, energy: Math.min(100, prev.energy + 1) };
          saveUserData(newUser);
          return newUser;
        }
        return prev;
      });
    }, 60000);
    return () => clearInterval(energyTimer);
  }, []);

  useEffect(() => {
    if (user.fid) {
      loadLeaderboard();
    }
  }, [user.fid, user.totalEarned]);

  const initializeFarcasterApp = async () => {
    try {
      // Get Farcaster context
      const context = await getFarcasterContext();
      
      let fid = context.fid || await getUserFid();
      
      if (!fid) {
        fid = generateFid();
        await window.storage.set('userFid', fid);
      }

      const userData = await loadUserData(fid);
      
      // Check for referral
      const urlParams = new URLSearchParams(window.location.search);
      const refFid = urlParams.get('ref');
      
      if (refFid && !userData.hasUsedReferral) {
        await processReferral(refFid, fid);
        userData.hasUsedReferral = true;
      }

      setUser({ 
        ...userData, 
        fid,
        username: context.username || userData.username || 'Anon',
        pfpUrl: context.pfpUrl || userData.pfpUrl
      });
      
      checkDailyReward();
      setLoading(false);
    } catch (error) {
      console.error('Init error:', error);
      const fallbackFid = generateFid();
      setUser(prev => ({ ...prev, fid: fallbackFid }));
      setLoading(false);
    }
  };

  const getFarcasterContext = async () => {
    // Detect Farcaster Frame context
    if (window.parent !== window) {
      try {
        // Frame context detection
        const response = await new Promise((resolve) => {
          window.addEventListener('message', (event) => {
            if (event.data.type === 'farcaster:context') {
              resolve(event.data);
            }
          });
          
          window.parent.postMessage({ type: 'farcaster:request_context' }, '*');
          
          setTimeout(() => resolve({}), 1000);
        });
        
        return response || {};
      } catch (error) {
        console.log('Not in Farcaster Frame context');
        return {};
      }
    }
    return {};
  };

  const generateFid = () => {
    return 'fid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const getUserFid = async () => {
    try {
      const result = await window.storage.get('userFid');
      return result?.value;
    } catch (error) {
      return null;
    }
  };

  const loadUserData = async (fid) => {
    try {
      const result = await window.storage.get(`farcaster_user_${fid}`);
      if (result?.value) {
        return JSON.parse(result.value);
      }
    } catch (error) {
      console.log('No saved data, starting fresh');
    }
    
    return {
      username: 'Anon',
      balance: 0,
      level: 1,
      xp: 0,
      energy: 100,
      totalEarned: 0,
      referrals: 0,
      completedTasks: [],
      hasUsedReferral: false,
      casts: 0
    };
  };

  const saveUserData = async (userData) => {
    if (!userData.fid) return;
    
    try {
      const dataToSave = { ...userData };
      delete dataToSave.fid;
      await window.storage.set(`farcaster_user_${userData.fid}`, JSON.stringify(dataToSave));
      
      await window.storage.set(
        `fc_leaderboard_${userData.fid}`,
        JSON.stringify({
          username: userData.username,
          totalEarned: userData.totalEarned,
          level: userData.level,
          fid: userData.fid
        }),
        true
      );
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const result = await window.storage.list('fc_leaderboard_', true);
      if (result?.keys) {
        const entries = await Promise.all(
          result.keys.map(async (key) => {
            try {
              const data = await window.storage.get(key, true);
              return data?.value ? JSON.parse(data.value) : null;
            } catch {
              return null;
            }
          })
        );
        
        const validEntries = entries
          .filter(e => e !== null)
          .sort((a, b) => b.totalEarned - a.totalEarned)
          .slice(0, 10);
        
        setLeaderboard(validEntries);
      }
    } catch (error) {
      console.error('Leaderboard load error:', error);
    }
  };

  const checkDailyReward = async () => {
    try {
      const result = await window.storage.get('lastRewardDate');
      const lastDate = result?.value;
      const today = new Date().toDateString();
      
      if (lastDate !== today) {
        setDailyRewardClaimed(false);
      } else {
        setDailyRewardClaimed(true);
      }
    } catch (error) {
      setDailyRewardClaimed(false);
    }
  };

  const tap = () => {
    if (user.energy < 1) return;
    
    const earnAmount = 2 + Math.floor(user.level / 3); // Better earnings for Farcaster
    const xpGain = 2;
    
    let newXp = user.xp + xpGain;
    let newLevel = user.level;
    const xpNeeded = newLevel * 100;
    
    if (newXp >= xpNeeded) {
      newLevel += 1;
      newXp = newXp - xpNeeded;
    }
    
    const newUser = {
      ...user,
      balance: user.balance + earnAmount,
      energy: user.energy - 1,
      xp: newXp,
      level: newLevel,
      totalEarned: user.totalEarned + earnAmount
    };
    
    setUser(newUser);
    saveUserData(newUser);
  };

  const claimDailyReward = async () => {
    if (dailyRewardClaimed) return;
    
    const reward = 200 + (user.level * 20); // Higher rewards for Farcaster
    const newUser = {
      ...user,
      balance: user.balance + reward,
      totalEarned: user.totalEarned + reward
    };
    
    setUser(newUser);
    await saveUserData(newUser);
    
    try {
      const today = new Date().toDateString();
      await window.storage.set('lastRewardDate', today);
      setDailyRewardClaimed(true);
    } catch (error) {
      console.error('Reward claim error:', error);
    }
  };

  const completeTask = async (taskId, reward) => {
    if (user.completedTasks.includes(taskId)) return;
    
    const newUser = {
      ...user,
      balance: user.balance + reward,
      totalEarned: user.totalEarned + reward,
      xp: user.xp + 15,
      completedTasks: [...user.completedTasks, taskId]
    };
    
    setUser(newUser);
    await saveUserData(newUser);
  };

  const castAboutApp = async () => {
    const castText = `Just earned ${user.balance} coins on Money Paiger! 💰\n\nLevel ${user.level} and counting! Join me: ${window.location.origin}?ref=${user.fid}`;
    
    setShareText(castText);
    
    // Farcaster composer intent
    const composerUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}`;
    window.open(composerUrl, '_blank');
    
    // Reward for casting
    const newUser = {
      ...user,
      balance: user.balance + 500,
      totalEarned: user.totalEarned + 500,
      casts: user.casts + 1
    };
    
    setUser(newUser);
    await saveUserData(newUser);
  };

  const processReferral = async (refFid, newFid) => {
    try {
      const refResult = await window.storage.get(`farcaster_user_${refFid}`);
      if (refResult?.value) {
        const referrerData = JSON.parse(refResult.value);
        referrerData.balance += 1000; // Higher referral bonus
        referrerData.totalEarned += 1000;
        referrerData.referrals += 1;
        
        await window.storage.set(`farcaster_user_${refFid}`, JSON.stringify(referrerData));
      }
    } catch (error) {
      console.log('Referral processing error:', error);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?ref=${user.fid}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOnFarcaster = () => {
    const text = `Check out Money Paiger! 💰 Tap to earn on Farcaster!\n\nJoin me: ${window.location.origin}?ref=${user.fid}`;
    const composerUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
    window.open(composerUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl font-bold animate-pulse mb-4">Loading Money Paiger...</div>
          <p className="text-purple-300">Powered by Farcaster</p>
        </div>
      </div>
    );
  }

  const xpNeeded = user.level * 100;
  const xpProgress = (user.xp / xpNeeded) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white pb-24">
      <div className="bg-black bg-opacity-30 backdrop-blur-md p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            {user.pfpUrl && (
              <img src={user.pfpUrl} alt="Profile" className="w-12 h-12 rounded-full border-2 border-purple-400" />
            )}
            <div>
              <h1 className="text-2xl font-bold">💰 Money Paiger</h1>
              <p className="text-sm text-purple-300">@{user.username} • Level {user.level}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-2xl font-bold text-yellow-400">
              <DollarSign size={24} />
              {user.balance.toLocaleString()}
            </div>
            <div className="text-xs text-gray-300">Total: ${user.totalEarned.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>XP: {user.xp}/{xpNeeded}</span>
            <span>{Math.floor(xpProgress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {activeTab === 'earn' && (
          <div className="space-y-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 text-center">
              <h2 className="text-xl font-bold mb-4">Tap to Earn</h2>
              
              <button
                onClick={tap}
                disabled={user.energy < 1}
                className="w-48 h-48 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-6xl font-bold shadow-2xl transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-yellow-500/50"
              >
                <DollarSign size={96} />
              </button>
              
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Zap size={20} className="text-yellow-400" />
                  <span className="text-lg">Energy: {user.energy}/100</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 max-w-xs mx-auto">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${user.energy}%` }}
                  />
                </div>
                <p className="text-sm text-gray-300">+{2 + Math.floor(user.level / 3)} coins per tap</p>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gift size={32} className="text-pink-400" />
                  <div>
                    <h3 className="font-bold text-lg">Daily Reward</h3>
                    <p className="text-sm text-gray-300">
                      {dailyRewardClaimed ? 'Come back tomorrow!' : `Claim ${200 + (user.level * 20)} coins`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={claimDailyReward}
                  disabled={dailyRewardClaimed}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  {dailyRewardClaimed ? '✓ Claimed' : 'Claim'}
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Share2 size={32} className="text-white" />
                  <div>
                    <h3 className="font-bold text-lg">Cast About Us!</h3>
                    <p className="text-sm text-gray-200">Share and earn 500 coins</p>
                  </div>
                </div>
                <button
                  onClick={castAboutApp}
                  className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all"
                >
                  Cast Now
                </button>
              </div>
              <p className="text-xs text-gray-200 mt-3">Casts shared: {user.casts}</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <TrendingUp size={24} />
                Farcaster Tasks
              </h3>
              <div className="space-y-3">
                <TaskItem 
                  taskId="follow_warpcast"
                  title="Follow on Warpcast"
                  reward={300}
                  completed={user.completedTasks.includes('follow_warpcast')}
                  onComplete={completeTask}
                />
                <TaskItem 
                  taskId="cast_intro"
                  title="Cast Your Intro"
                  reward={400}
                  completed={user.completedTasks.includes('cast_intro')}
                  onComplete={completeTask}
                />
                <TaskItem 
                  taskId="join_channel"
                  title="Join Our Channel"
                  reward={250}
                  completed={user.completedTasks.includes('join_channel')}
                  onComplete={completeTask}
                />
                <TaskItem 
                  taskId="like_cast"
                  title="Like Our Latest Cast"
                  reward={200}
                  completed={user.completedTasks.includes('like_cast')}
                  onComplete={completeTask}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="space-y-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 text-center">
              <Users size={64} className="mx-auto mb-4 text-blue-400" />
              <h2 className="text-2xl font-bold mb-2">Refer & Earn</h2>
              <p className="text-gray-300 mb-6">Invite Farcaster friends and earn 1000 coins per referral!</p>
              
              <div className="bg-black bg-opacity-30 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-400 mb-2">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <code className="text-yellow-400 text-sm break-all flex-1">
                    {window.location.origin}?ref={user.fid}
                  </code>
                  <button
                    onClick={copyReferralLink}
                    className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 transition-all"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>

              {copied && (
                <p className="text-green-400 text-sm mb-4">✓ Link copied to clipboard!</p>
              )}

              <button
                onClick={shareOnFarcaster}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={24} />
                Share on Farcaster
              </button>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Total Referrals</p>
                  <p className="text-3xl font-bold">{user.referrals}</p>
                </div>
                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Referral Earnings</p>
                  <p className="text-3xl font-bold text-yellow-400">${user.referrals * 1000}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Award size={28} className="text-yellow-400" />
              Farcaster Leaderboard
            </h2>
            <div className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((player, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      player.fid === user.fid
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg' 
                        : 'bg-black bg-opacity-30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <span className="font-semibold">@{player.username}</span>
                        <p className="text-xs text-gray-400">Level {player.level}</p>
                      </div>
                    </div>
                    <span className="text-yellow-400 font-bold">${player.totalEarned.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-8">No players yet. Be the first!</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-md border-t border-white border-opacity-10">
        <div className="max-w-4xl mx-auto flex justify-around p-4">
          <NavButton 
            icon={<DollarSign size={24} />}
            label="Earn"
            active={activeTab === 'earn'}
            onClick={() => setActiveTab('earn')}
          />
          <NavButton 
            icon={<Users size={24} />}
            label="Referral"
            active={activeTab === 'referral'}
            onClick={() => setActiveTab('referral')}
          />
          <NavButton 
            icon={<Award size={24} />}
            label="Leaderboard"
            active={activeTab === 'leaderboard'}
            onClick={() => setActiveTab('leaderboard')}
          />
        </div>
      </div>
    </div>
  );
}

function TaskItem({ taskId, title, reward, completed, onComplete }) {
  const handleComplete = () => {
    if (!completed) {
      onComplete(taskId, reward);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-black bg-opacity-30 rounded-xl">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-yellow-400">+{reward} coins</p>
      </div>
      <button
        onClick={handleComplete}
        disabled={completed}
        className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
      >
        {completed ? '✓ Done' : 'Start'}
      </button>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${
        active ? 'text-yellow-400 scale-110' : 'text-gray-400'
      }`}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
