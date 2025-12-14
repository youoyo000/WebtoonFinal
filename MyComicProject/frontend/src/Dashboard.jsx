import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Gift, Lock, CheckCircle, Zap, LayoutGrid, Sparkles } from 'lucide-react';

const Dashboard = () => {
  // 資料與篩選狀態
  const [comics, setComics] = useState([]);
  const [filteredComics, setFilteredComics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // --- 分頁狀態 ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // 統計數據
  const [stats, setStats] = useState({ 
    total: 0, 
    freeOngoing: 0, 
    freeCompleted: 0, 
    paid: 0 
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchComics();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [comics, searchTerm, filterType]);

  // === 核心判斷邏輯 (完全保留) ===
  const getComicStatus = (comic) => {
    const text = comic.access || comic.episodes || '';
    if (text.includes('需要追漫券')) return 'paid';
    else if (text.includes('可免費看完整話數') || (text.includes('已完結') && !text.includes('追漫券'))) return 'free_completed';
    else return 'free_ongoing';
  };

  const fetchComics = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/comics');
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

  const getImg = (url) => `http://localhost:5000/api/proxy-image?url=${encodeURIComponent(url)}`;

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 min-h-screen font-sans text-slate-800">
      
      {/* --- 標題區塊 --- */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-slate-200/50">
        <div className="animate-fade-in-up">
          <h1 className="text-4xl font-extrabold flex items-center tracking-tight">
            <BookOpen className="mr-3 text-green-500 drop-shadow-sm" size={36} strokeWidth={2.5} /> 
            {/* 修改處：名稱已更改 */}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-teal-500">
              漫畫補給站
            </span>
          </h1>
        </div>

        {/* --- 搜尋列 --- */}
        <div className="relative w-full md:w-80 group animate-fade-in-up delay-100">
          <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-300" size={20} />
          <input
            type="text"
            placeholder="搜尋作品..."
            className="pl-12 pr-4 py-3 border-2 border-transparent rounded-full w-full bg-white/80 backdrop-blur-sm shadow-sm focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-200/50 transition-all duration-300 text-sm font-bold placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* --- 數據儀表板 --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 animate-fade-in-up delay-200">
        
        {/* 按鈕 1: 全部 */}
        <FilterCard 
          active={filterType === 'all'}
          onClick={() => setFilterType('all')}
          title="全部漫畫"
          count={stats.total}
          icon={<LayoutGrid size={24} />}
          theme="blue"
        />

        {/* 按鈕 2: 免費完結 */}
        <FilterCard 
          active={filterType === 'free_completed'}
          onClick={() => setFilterType('free_completed')}
          title="免費完結"
          count={stats.freeCompleted}
          icon={<Gift size={24} />}
          theme="green"
        />

        {/* 按鈕 3: 付費/追漫券 */}
        <FilterCard 
          active={filterType === 'paid'}
          onClick={() => setFilterType('paid')}
          title="需追漫券"
          count={stats.paid}
          icon={<Lock size={24} />}
          theme="purple"
        />
      </div>

      {/* --- 列表區塊 --- */}
      {currentItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/60 backdrop-blur-md rounded-[2rem] border-2 border-dashed border-gray-300 animate-fade-in-up delay-300">
          <div className="bg-white p-5 rounded-full mb-4 shadow-md animate-bounce-slow">
            <Sparkles size={40} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold text-lg">沒有找到符合條件的漫畫</p>
          <button onClick={() => {setSearchTerm(''); setFilterType('all');}} className="mt-5 px-6 py-2 bg-green-50 text-green-600 font-bold rounded-full hover:bg-green-100 transition-colors shadow-sm">
            清除所有篩選
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8 animate-fade-in-up delay-300">
            {currentItems.map((comic, index) => {
              const status = getComicStatus(comic);
              return (
                <div 
                  key={comic.id} 
                  onClick={() => navigate(`/comic/${comic.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-green-100/50 hover:-translate-y-2 transition-all duration-500 ease-out cursor-pointer group border border-gray-100/50 relative z-0 hover:z-10"
                >
                  {/* 圖片區域 */}
                  <div className="h-32 overflow-hidden relative bg-gray-200">
                    <img
                      src={getImg(comic.picture)}
                      alt={comic.title}
                      className="w-full h-full object-cover object-left group-hover:scale-110 transition-transform duration-700 ease-in-out"
                      loading="lazy"
                    />
                    
                    {/* 狀態標籤 */}
                    {status === 'paid' && (
                      <div className="absolute top-2 left-2 bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center">
                        <Lock size={10} className="mr-1"/> 追漫券
                      </div>
                    )}
                    {status === 'free_completed' && (
                      <div className="absolute top-2 left-2 bg-green-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center">
                        <CheckCircle size={10} className="mr-1"/> 免費完結
                      </div>
                    )}
                    {status === 'free_ongoing' && (
                      <div className="absolute top-2 left-2 bg-orange-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center">
                        <Zap size={10} className="mr-1"/> 連載
                      </div>
                    )}
                    
                    {/* 類型標籤 */}
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full">
                      {comic.genre}
                    </div>
                  </div>

                  {/* 文字區域 */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 truncate text-sm mb-1 group-hover:text-green-600 transition-colors duration-300" title={comic.title}>
                      {comic.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mb-3">{comic.author}</p>
                    
                    <div className="flex justify-between items-center text-[10px] font-medium">
                      <span className={
                        status === 'paid' ? "text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full" :
                        status === 'free_completed' ? "text-green-700 bg-green-50 px-2 py-0.5 rounded-full" :
                        "text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full"
                      }>
                        {comic.episodes}
                      </span>
                      <span className="text-gray-400">{comic.crawl_date?.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --- 分頁按鈕區 --- */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-16 gap-4 pb-12 animate-fade-in-up delay-500">
              <button 
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-6 py-3 bg-white border-2 border-gray-100 rounded-full hover:border-green-400 hover:text-green-600 hover:shadow-lg disabled:opacity-40 disabled:hover:border-gray-100 disabled:hover:text-gray-400 disabled:hover:shadow-none text-sm font-bold text-gray-600 transition-all duration-300 active:scale-95"
              >
                上一頁
              </button>
              
              <span className="bg-white px-6 py-3 rounded-full shadow-sm border border-gray-100 text-gray-500 text-sm font-medium">
                <span className="text-green-500 font-extrabold text-lg mx-1">{currentPage}</span> / {totalPages}
              </span>
              
              <button 
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-6 py-3 bg-white border-2 border-gray-100 rounded-full hover:border-green-400 hover:text-green-600 hover:shadow-lg disabled:opacity-40 disabled:hover:border-gray-100 disabled:hover:text-gray-400 disabled:hover:shadow-none text-sm font-bold text-gray-600 transition-all duration-300 active:scale-95"
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- 修改後的篩選卡片元件 ---
const FilterCard = ({ active, onClick, title, count, icon, theme }) => {
    const themes = {
      blue: {
        bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100 text-blue-600',
        text: 'text-blue-800',
        shadow: 'hover:shadow-blue-100'
      },
      green: {
        bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
        border: 'border-green-200',
        iconBg: 'bg-green-100 text-green-600',
        text: 'text-green-800',
        shadow: 'hover:shadow-green-100'
      },
      purple: {
        bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50',
        border: 'border-purple-200',
        iconBg: 'bg-purple-100 text-purple-600',
        text: 'text-purple-800',
        shadow: 'hover:shadow-purple-100'
      }
    };
    const t = themes[theme];
  
    return (
      <div 
        onClick={onClick}
        className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 group relative overflow-hidden active:scale-95 hover:-translate-y-1
          ${active 
            ? `${t.bg} ${t.border} shadow-md scale-[1.02]` 
            : `bg-white border-transparent hover:border-gray-100 hover:shadow-xl ${t.shadow}`}`}
      >
        <div className="flex justify-between items-center mb-3 relative z-10">
          <span className={`text-sm font-bold flex items-center px-3 py-1.5 rounded-full transition-colors duration-300 ${active ? t.iconBg : 'bg-gray-100 text-gray-500 group-hover:bg-white/80'}`}>
            <span className="mr-2">{icon}</span> {title}
          </span>
        </div>
        <h2 className={`text-4xl font-extrabold relative z-10 transition-colors duration-300 ${active ? t.text : 'text-gray-800 group-hover:text-black'}`}>
          {count}
        </h2>
        
        {/* --- 裝飾背景圖標 (bottom-8 right-8) --- */}
        <div className={`absolute bottom-8 right-8 opacity-20 transform rotate-12 scale-[2] pointer-events-none transition-all duration-500 ease-in-out group-hover:scale-[2.2] group-hover:opacity-30 group-hover:-rotate-12 ${t.text}`}>
          {icon}
        </div>
      </div>
    );
  };

export default Dashboard;