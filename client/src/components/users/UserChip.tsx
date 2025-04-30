import React, { useState } from 'react';

interface UserChipProps {
  name: string;
  iconUrl?: string;
  tooltipContent?: string;
  onClick?: () => void;
}

const UserChip: React.FC<UserChipProps> = ({ name, iconUrl, tooltipContent, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <div
        className="user-icon cursor-pointer"
        style={iconUrl ? { backgroundImage: `url(${iconUrl})`, backgroundSize: 'cover' } : {}}
        onClick={onClick}
        onMouseEnter={() => tooltipContent && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {!iconUrl && initials}
      </div>
      
      {showTooltip && tooltipContent && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-dark-100 text-xs rounded shadow-lg z-10 whitespace-nowrap">
          <div className="font-bold mb-0.5">{name}</div>
          <div>{tooltipContent}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-dark-100"></div>
        </div>
      )}
    </div>
  );
};

export default UserChip;