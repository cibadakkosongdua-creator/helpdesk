"use client"

import { useState, useMemo } from "react"

export type PaginationState = {
  currentPage: number
  pageSize: number
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
}

export type UsePaginationOptions = {
  totalItems: number
  pageSize?: number
  initialPage?: number
}

export function usePagination({
  totalItems,
  pageSize = 10,
  initialPage = 1,
}: UsePaginationOptions) {
  const [currentPage, setCurrentPage] = useState(initialPage)

  const pagination = useMemo<PaginationState>(() => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const validPage = Math.min(Math.max(1, currentPage), totalPages)
    const startIndex = (validPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalItems)

    return {
      currentPage: validPage,
      pageSize,
      totalPages,
      totalItems,
      startIndex,
      endIndex,
    }
  }, [totalItems, pageSize, currentPage])

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), pagination.totalPages))
  }

  const nextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage((p) => p + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1)
    }
  }

  const firstPage = () => setCurrentPage(1)
  const lastPage = () => setCurrentPage(pagination.totalPages)

  // Get paginated slice of items
  const paginate = <T>(items: T[]): T[] => {
    return items.slice(pagination.startIndex, pagination.endIndex)
  }

  return {
    pagination,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    paginate,
    setCurrentPage,
  }
}
