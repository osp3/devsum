import React from 'react';

const RepoCard = ({ repository }) => {
  return (
    <div
      style={{
        border: '1px solid #ccc',
        padding: '15px',
        margin: '10px',
        borderRadius: '5px',
      }}
    >
      <h3>{repository.name}</h3>
      <p>{repository.description || 'No description'}</p>
      <small>Language: {repository.language || 'Not specified'}</small>
    </div>
  );
};

export default RepoCard;
