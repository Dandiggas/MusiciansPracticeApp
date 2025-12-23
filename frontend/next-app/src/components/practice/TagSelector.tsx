"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Tag as TagIcon } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTags: number[];
  onTagsChange: (tagIds: number[]) => void;
  apiBaseUrl: string;
  token: string;
}

export function TagSelector({ selectedTags, onTagsChange, apiBaseUrl, token }: TagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/tags/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      setAvailableTags(response.data);
    } catch (error) {
      console.error('Error fetching tags', error);
    }
  };

  const handleToggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await axios.post(
        `${apiBaseUrl}/tags/`,
        { name: newTagName, color: newTagColor },
        { headers: { 'Authorization': `Token ${token}` } }
      );

      setAvailableTags([...availableTags, response.data]);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating tag', error);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      await axios.delete(`${apiBaseUrl}/tags/${tagId}/`, {
        headers: { 'Authorization': `Token ${token}` }
      });

      setAvailableTags(availableTags.filter(tag => tag.id !== tagId));
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } catch (error) {
      console.error('Error deleting tag', error);
    }
  };

  const predefinedColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2 mb-3">
          <TagIcon className="h-4 w-4" />
          Tags
        </Label>

        {/* Available Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {availableTags.map(tag => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <div key={tag.id} className="relative group">
                <Badge
                  onClick={() => handleToggleTag(tag.id)}
                  className="cursor-pointer transition-all"
                  style={{
                    backgroundColor: isSelected ? tag.color : 'transparent',
                    color: isSelected ? 'white' : tag.color,
                    borderColor: tag.color,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  {tag.name}
                </Badge>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {availableTags.length === 0 && !isCreating && (
            <p className="text-sm text-muted-foreground">No tags yet. Create your first tag!</p>
          )}
        </div>

        {/* Create New Tag */}
        {isCreating ? (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="tag-name" className="text-sm">Tag Name</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g., Scales, Chords, Technique"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Color</Label>
              <div className="flex gap-2">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newTagColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateTag} size="sm" className="flex-1">
                <Plus className="h-4 w-4 mr-1" />
                Create Tag
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName('');
                  setNewTagColor('#3B82F6');
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Tag
          </Button>
        )}
      </div>

      {/* Selected Tags Preview */}
      {selectedTags.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-sm font-medium mb-2">Selected for this session:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tagId => {
              const tag = availableTags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <Badge
                  key={tag.id}
                  style={{
                    backgroundColor: tag.color,
                    color: 'white',
                  }}
                >
                  {tag.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
