import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Gift, Lock, CheckCircle, Zap, LayoutGrid, Sparkles, Trophy, Hourglass } from 'lucide-react';

const Dashboard = () => {
  // 資料與篩選狀態
  const [comics, setComics] = useState([]);
  const [filteredComics, setFilteredComics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
   
  // --- 分頁狀態 ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; 

  // 統計數據
  const [stats, setStats] = useState({ 
    total: 0, 
    freeOngoing: 0, 
    freeCompleted: 0, 
    paid: 0 
  });

  const navigate = useNavigate();

  // ---------------------------------------------------------
  // 🔴 請將下方的網址改成您 Render 後端的實際網址 (不要有最後的斜線)
  // ---------------------------------------------------------
  const BACKEND_URL = "https://你的後端網址.onrender.com"; 

  useEffect(() => {
    fetchComics();
  }, [BACKEND_URL]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [comics, searchTerm, filterType]);

  // === 核心判斷邏輯 ===
  const getComicStatus = (comic) => {
    const text = comic.access || comic.episodes || '';
    if (text.includes('需要追漫券')) return 'paid';
    else if (text.includes('可免費看完整話數') || (text.includes('已完結') && !text.includes('追漫券'))) return 'free_completed';
    else return 'free_ongoing';
  };

  const fetchComics = async () => {
    try {
      // ✅ 已修改：使用雲端網址
      const res = await axios.get(`${BACKEND_URL}/api/comics`);
      const data = res.data;
      setComics(data);
      
      let s_ongoing = 0, s_free_comp = 0, s_paid = 0;
      data.forEach(c => {
        const status = getComicStatus(c);
        if (status === 'free_ongoing') s_ongoing++;
        if (status === 'free_completed') s_free_comp++;
        if (status === 'paid') s_paid++;
      });
      
      setStats({
        total: data.length,
        freeOngoing: s_ongoing,
        freeCompleted: s_free_comp,
        paid: s_paid
      });
      
    } catch (error) {
      console.error("無法連線到後端:", error);
    }
  };

  const applyFilters = () => {
    let result = comics;
    if (searchTerm) result = result.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterType !== 'all') result = result.filter(c => getComicStatus(c) === filterType);
    setFilteredComics(result);
  };

  // --- 分頁計算 ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredComics.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredComics.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ 已修改：使用雲端網址
  const getImg = (url) => `${BACKEND_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;

  return (
    // 1. 全局背景：Webtoon 風格 (淺綠白漸層)
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto bg-[#f8fff9] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/40 via-white to-white min-h-screen font-sans text-slate-800 relative overflow-hidden">
      
      {/* 裝飾：背景呼吸光暈 */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-200/20 rounded-full blur-[100px] animate-pulse-slow pointer-events-none"></div>

      {/* --- 標題區塊 --- */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-emerald-100 relative z-10">
        <div className="animate-fade-in-up">
          <h1 className="text-4xl font-extrabold flex items-center tracking-tight text-slate-900 group cursor-default">
            {/* Logo 使用 Webtoon 綠 */}
            <BookOpen className="mr-3 text-[#00dc64] drop-shadow-sm group-hover:scale-110 transition-transform duration-300" size={38} strokeWidth={2.5} /> 
            <span>
              漫畫補給站
            </span>
          </h1>
        </div>

        {/* --- 搜尋列 (Webtoon 風格) --- */}
        <div className="relative w-full md:w-96 group animate-fade-in-up delay-100">
          <Search className="absolute left-5 top-3.5 text-slate-400 group-focus-within:text-[#00dc64] transition-colors duration-300" size={20} />
          <input
            type="text"
            placeholder="搜尋漫畫名稱..."
            className="pl-14 pr-6 py-3 border-2 border-slate-100 rounded-full w-full bg-white shadow-sm 
                       focus:outline-none focus:border-[#00dc64] focus:ring-4 focus:ring-emerald-100 
                       transition-all duration-300 text-sm font-bold placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* --- 數據篩選按鈕 (Webtoon 風格) --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 animate-fade-in-up delay-200">
        
        {/* 按鈕 1: 全部 */}
        <FilterCard 
          active={filterType === 'all'}
          onClick={() => setFilterType('all')}
          title="全部漫畫"
          count={stats.total}
          icon={<LayoutGrid size={22} />}
        />

        {/* 按鈕 2: 免費連載 */}
        <FilterCard 
          active={filterType === 'free_ongoing'}
          onClick={() => setFilterType('free_ongoing')}
          title="免費連載"
          count={stats.freeOngoing}
          icon={<Zap size={22} />}
        />

        {/* 按鈕 3: 免費完結 */}
        <FilterCard 
          active={filterType === 'free_completed'}
          onClick={() => setFilterType('free_completed')}
          title="免費完結"
          count={stats.freeCompleted}
          icon={<Trophy size={22} />} 
        />

        {/* 按鈕 4: 付費/追漫券 */}
        <FilterCard 
          active={filterType === 'paid'}
          onClick={() => setFilterType('paid')}
          title="需追漫券"
          count={stats.paid}
          icon={<Lock size={22} />}
        />
      </div>

      {/* --- 列表區塊 --- */}
      {currentItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-fade-in-up delay-300">
          <div className="bg-emerald-50 p-6 rounded-full mb-4 shadow-inner animate-bounce-slow">
            <Sparkles size={40} className="text-emerald-400" />
          </div>
          <p className="text-slate-500 font-bold text-lg">沒有找到符合條件的漫畫</p>
          <button onClick={() => {setSearchTerm(''); setFilterType('all');}} className="mt-5 px-8 py-2.5 bg-[#00dc64] text-white font-bold rounded-full hover:bg-[#00c85a] hover:shadow-lg transition-all active:scale-95">
            清除所有篩選
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-10 animate-fade-in-up delay-300">
            {currentItems.map((comic, index) => {
              const status = getComicStatus(comic);
              return (
                <div 
                  key={comic.id} 
                  onClick={() => navigate(`/comic/${comic.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_10px_40px_-10px_rgba(0,220,100,0.3)] 
                             hover:-translate-y-2 hover:ring-2 hover:ring-[#00dc64]
                             transition-all duration-300 ease-out cursor-pointer group border border-slate-100 relative"
                >
                  {/* 圖片區域 */}
                  <div className="h-40 overflow-hidden relative bg-slate-100">
                    <img
                      src={getImg(comic.picture)}
                      alt={comic.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                    
                    {/* 狀態標籤 */}
                    {status === 'paid' && (
                      <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center">
                        <Lock size={10} className="mr-1 text-purple-400"/> 追漫券
                      </div>
                    )}
                    {status === 'free_completed' && (
                      <div className="absolute top-2 left-2 bg-[#00dc64] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center">
                        <CheckCircle size={10} className="mr-1"/> 完結
                      </div>
                    )}
                    {status === 'free_ongoing' && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center">
                        <Hourglass size={10} className="mr-1"/> 連載
                      </div>
                    )}
                    
                    {/* 類型標籤 */}
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm border border-white/50">
                      {comic.genre}
                    </div>
                  </div>

                  {/* 文字區域 */}
                  <div className="p-4">
                    <h3 className="font-extrabold text-slate-800 truncate text-sm mb-1 group-hover:text-[#00dc64] transition-colors duration-300" title={comic.title}>
                      {comic.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mb-3">{comic.author}</p>
                    
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                        {comic.episodes}
                      </span>
                      <span className="text-[#00dc64] flex items-center">
                        {comic.crawl_date?.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- 分頁按鈕區 (Webtoon 風格) --- */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-16 gap-3 pb-12 animate-fade-in-up delay-500">
              <button 
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-full hover:border-[#00dc64] hover:text-[#00dc64] disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-400 text-sm font-bold text-slate-600 transition-all active:scale-95"
              >
                Prev
              </button>
              
              <span className="bg-white px-6 py-2.5 rounded-full shadow-sm border border-slate-100 text-slate-400 text-sm font-bold">
                <span className="text-[#00dc64] text-lg mx-1">{currentPage}</span> / {totalPages}
              </span>
              
              <button 
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-full hover:border-[#00dc64] hover:text-[#00dc64] disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-400 text-sm font-bold text-slate-600 transition-all active:scale-95"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Webtoon 風格篩選卡片 ---
const FilterCard = ({ active, onClick, title, count, icon }) => {
    return (
      <div 
        onClick={onClick}
        className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 group relative overflow-hidden active:scale-95 hover:-translate-y-1
          ${active 
            ? 'bg-[#00dc64] border-[#00dc64] shadow-lg shadow-emerald-200' 
            : 'bg-white border-slate-100 hover:border-[#00dc64] hover:shadow-md'
          }`}
      >
        <div className="flex justify-between items-center mb-2 relative z-10">
          <span className={`text-sm font-bold flex items-center transition-colors duration-300 
            ${active ? 'text-white' : 'text-slate-500 group-hover:text-[#00dc64]'}`}>
            <span className={`mr-2 p-1.5 rounded-lg ${active ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-emerald-50'}`}>
              {icon}
            </span> 
            {title}
          </span>
        </div>
        
        <h2 className={`text-3xl font-black relative z-10 transition-colors duration-300 
          ${active ? 'text-white' : 'text-slate-800'}`}>
          {count}
        </h2>
        
        {/* --- 裝飾背景圖標 --- */}
        <div className={`absolute bottom-[-10px] right-[-10px] opacity-10 transform rotate-12 scale-[2.5] pointer-events-none transition-all duration-500 
          ${active ? 'text-white' : 'text-[#00dc64] group-hover:scale-[3] group-hover:rotate-0'}`}>
          {icon}
        </div>
      </div>
    );
  };

export default Dashboard;ㄒ