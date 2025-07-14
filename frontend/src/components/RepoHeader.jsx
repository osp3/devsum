import React from 'react';

const RepoHeader = ({ selectedRepo }) => {
  // const [repo, setRepo]=useState('')
  // useEffect(()=>{
  // },[])
  if (!selectedRepo) {
    return (
      <div className="flex flex-col">
        <div className="border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto">
          <h1 className="text-white text-xl">No repository selected</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex  justify-col rounded-2xl p-4 m-6 max-w-6xl mx-auto">
        How Im I getting github repos here
      </div>

      <div className=" border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl mx-auto">
        <h1> Analysis complete repoName</h1>
      </div>
    </div>
  );
};

<div className=" border border-slate-400 rounded-2xl p-4 m-6 max-w-6xl ">
  <h1> Analysis complete for repoName</h1>
</div>;

export default RepoHeader;
