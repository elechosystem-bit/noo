export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  familyId: string;
  role: "admin" | "member";
  createdAt: Date;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  members: string[];
  createdAt: Date;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  familyId: string;
  content: string;
  imageURLs?: string[];
  likes: string[];
  commentsCount: number;
  createdAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  familyId: string;
  content: string;
  isAI?: boolean;
  createdAt: Date;
}
