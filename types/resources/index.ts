export type ResourceCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  resourceType: string | null
  classId: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  ownerName: string
  ownerImage: string | null
}

export type ResourceData = {
  id: string
  title: string
  description: string | null
  category: string | null
  resourceType: string | null
  classId: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string | null
  storagePath: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    image: string | null
    email: string
  }
  class?: {
    id: string
    title: string
    gradeLevel: string | null
    customGrade: string | null
    section: string | null
  } | null
}
