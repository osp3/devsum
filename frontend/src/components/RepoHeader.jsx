import React from 'react';

// Repository header component to display selected repo info and analysis status
const RepoHeader = ({ selectedRepo }) => {
  // const [repo, setRepo]=useState('')
  // useEffect(()=>{
  // },[])
  
  // Show fallback message when no repository is selected
  if (!selectedRepo) {
    return (
      <div className="flex flex-col">
        <div className="border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto">
          <h1 className="text-white text-xl">No repository selected</h1>
        </div>
      </div>
    );
  }

  // Main header layout for selected repository
  return (
    <div className="flex flex-col">
     
      {/* Analysis status display section */}
      <div className=" border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto">
        <h1 className="text-white text-xl">Analysis complete for {selectedRepo.name}</h1>
      </div>
    </div>
  );
};

export default RepoHeader;
