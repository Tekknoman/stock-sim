import React, { useState, useEffect } from "react";
import { createAvatar } from "@dicebear/core";
import * as loreleiStyle from "@dicebear/lorelei";
import * as bottsStyle from "@dicebear/bottts";
import * as pixelArtStyle from "@dicebear/pixel-art";
import * as avataaarsStyle from "@dicebear/avataaars";

interface UserChipProps {
  name: string;
  iconUrl?: string;
  tooltipContent?: string;
  onClick?: () => void;
}

// Define a type for the avatar that includes the toDataUri method
type AvatarType = {
  toDataUri: () => string;
};

const UserChip: React.FC<UserChipProps> = ({
  name,
  iconUrl,
  tooltipContent,
  onClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string>("");

  // Generate a DiceBear avatar based on username
  useEffect(() => {
    console.log("UserChip for:", name, "iconUrl:", iconUrl);

    if (iconUrl && iconUrl.length > 0) {
      console.log("Using custom icon URL:", iconUrl);
      setGeneratedAvatarUrl(iconUrl);
      return;
    }

    if (!name || name.length === 0) {
      console.error("No name provided for avatar generation.");
      return;
    }

    try {
      // Create a deterministic but pseudo-random number from the username
      const charSum = name
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const styleIndex = charSum % 4; // Choose one of 4 styles based on username

      console.log("Generating avatar for:", name, "styleIndex:", styleIndex);

      // Select a style based on the username and create avatar
      let avatar;
      switch (styleIndex) {
        case 0:
          avatar = createAvatar(loreleiStyle, {
            seed: name,
          });
          break;
        case 1:
          avatar = createAvatar(bottsStyle, {
            seed: name,
          });
          break;
        case 2:
          avatar = createAvatar(pixelArtStyle, {
            seed: name,
          });
          break;
        default:
          avatar = createAvatar(avataaarsStyle, {
            seed: name,
          });
      }

      // Get the data URI directly
      const dataUri = avatar.toDataUri();
      console.log(
        "Generated avatar data URI (first 50 chars):",
        dataUri.substring(0, 50) + "..."
      );
      setGeneratedAvatarUrl(dataUri);
    } catch (error) {
      console.error("Error generating avatar:", error);
    }
  }, [name, iconUrl]);

  return (
    <div className="relative">
      <div
        className="user-icon cursor-pointer"
        style={
          generatedAvatarUrl
            ? {
                backgroundImage: `url("${generatedAvatarUrl}")`,
                backgroundSize: "cover",
              }
            : {}
        }
        onClick={onClick}
        onMouseEnter={() => tooltipContent && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {!generatedAvatarUrl && name.charAt(0).toUpperCase()}
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
