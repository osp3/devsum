import React from 'react';

// Repository header component to display selected repo info and analysis status
const RepoHeader = ({ selectedRepo }) => {
  // const [repo, setRepo]=useState('')
  // useEffect(()=>{
  // },[])

  // Show fallback message when no repository is selected
  if (!selectedRepo) {
    return (
      <div className='px-4 py-6 text-center'>
        <h1 className='text-xl text-fg/65'>No repository selected</h1>
      </div>
    );
  }

  // Main header layout for selected repository
  return (
    <div className='px-4 py-6 text-center'>
      <p className='eyebrow'>Analysis complete</p>
      <h1 className='mt-2 text-3xl font-semibold tracking-[-0.03em] break-all'>
        {selectedRepo.name}
      </h1>
    </div>
  );
};

export default RepoHeader;
