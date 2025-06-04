// CategoriesContext.jsx - Cache global para reduzir leituras do Firebase

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase.jsx";

const CategoriesContext = createContext();

export const CategoriesProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState(new Map());
  const [subcategoriesMap, setSubcategoriesMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Cache por 5 minutos
  const CACHE_DURATION = 5 * 60 * 1000;

  const fetchAllCategories = async (forceRefresh = false) => {
    // Se já tem dados e não passou do tempo de cache, não busca novamente
    if (!forceRefresh && lastFetch && Date.now() - lastFetch < CACHE_DURATION) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Buscar TODAS as categorias de uma vez só
      const allCategoriesQuery = query(collection(db, "categorias"));
      const allCategoriesSnapshot = await getDocs(allCategoriesQuery);

      const mainCats = [];
      const subCats = [];
      const catsMap = new Map();
      const subCatsMap = new Map();

      // Organizar em uma única passagem
      allCategoriesSnapshot.docs.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };

        if (data.parentId === null || data.parentId === undefined) {
          // É uma categoria principal
          mainCats.push(data);
          catsMap.set(data.id, data);
        } else {
          // É uma subcategoria
          subCats.push(data);

          // Organizar subcategorias por categoria pai
          if (!subCatsMap.has(data.parentId)) {
            subCatsMap.set(data.parentId, []);
          }
          subCatsMap.get(data.parentId).push(data);
        }
      });

      setCategories(mainCats);
      setSubcategories(subCats);
      setCategoriesMap(catsMap);
      setSubcategoriesMap(subCatsMap);
      setLastFetch(Date.now());
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
      setError("Erro ao carregar categorias");
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar na primeira vez
  useEffect(() => {
    fetchAllCategories();

    // ✅ OTIMIZAÇÃO: Limpar cache quando a aba for fechada/minimizada
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Opcional: limpar cache quando não está visível há muito tempo
        const timeSinceLastFetch = Date.now() - (lastFetch || 0);
        if (timeSinceLastFetch > CACHE_DURATION * 2) {
          console.log("🧹 Limpando cache de categorias por inatividade");
          setCategories([]);
          setSubcategories([]);
          setCategoriesMap(new Map());
          setSubcategoriesMap(new Map());
          setLastFetch(null);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [lastFetch]);

  // Função para buscar categoria por ID (do cache)
  const getCategoryById = (id) => {
    return categoriesMap.get(id) || null;
  };

  // Função para buscar categoria por nome (do cache)
  const getCategoryByName = (name) => {
    return (
      categories.find((cat) => cat.name.toLowerCase() === name.toLowerCase()) ||
      null
    );
  };

  // Função para buscar subcategorias de uma categoria (do cache)
  const getSubcategoriesByParent = (parentId) => {
    return subcategoriesMap.get(parentId) || [];
  };

  // Função para buscar subcategoria por ID (do cache)
  const getSubcategoryById = (id) => {
    for (const subCatsArray of subcategoriesMap.values()) {
      const found = subCatsArray.find((sub) => sub.id === id);
      if (found) return found;
    }
    return null;
  };

  // Função para buscar subcategoria por nome dentro de uma categoria (do cache)
  const getSubcategoryByName = (name, parentId) => {
    const subcats = getSubcategoriesByParent(parentId);
    return (
      subcats.find((sub) => sub.name.toLowerCase() === name.toLowerCase()) ||
      null
    );
  };

  // Função para invalidar cache e recarregar
  const refreshCategories = () => {
    return fetchAllCategories(true);
  };

  // Função para adicionar nova categoria ao cache (quando criar uma nova)
  const addCategoryToCache = (newCategory) => {
    console.log(`Tentando adicionar categoria ao cache:`, newCategory);

    // Verificar se já existe para evitar duplicatas
    const existingMain = categoriesMap.get(newCategory.id);
    const existingSub = getSubcategoryById(newCategory.id);

    if (existingMain || existingSub) {
      console.warn(
        `⚠️ Categoria com ID ${newCategory.id} já existe no cache, ignorando duplicata`
      );
      return false;
    }

    if (newCategory.parentId === null || newCategory.parentId === undefined) {
      // É categoria principal
      console.log(
        `✅ Adicionando categoria principal: ${newCategory.name} (ID: ${newCategory.id})`
      );
      setCategories((prev) => [...prev, newCategory]);
      setCategoriesMap((prev) =>
        new Map(prev).set(newCategory.id, newCategory)
      );
    } else {
      // É subcategoria
      console.log(
        `✅ Adicionando subcategoria: ${newCategory.name} (ID: ${newCategory.id}, Parent: ${newCategory.parentId})`
      );
      setSubcategories((prev) => [...prev, newCategory]);
      setSubcategoriesMap((prev) => {
        const newMap = new Map(prev);
        if (!newMap.has(newCategory.parentId)) {
          newMap.set(newCategory.parentId, []);
        }
        newMap.get(newCategory.parentId).push(newCategory);
        return newMap;
      });
    }

    return true;
  };

  // Função para verificar se já existe categoria com o mesmo nome
  const categoryNameExists = (name, parentId = null) => {
    if (parentId === null) {
      // Verificar categorias principais
      return categories.some(
        (cat) => cat.name.toLowerCase() === name.toLowerCase()
      );
    } else {
      // Verificar subcategorias da categoria pai
      const subcats = getSubcategoriesByParent(parentId);
      return subcats.some(
        (sub) => sub.name.toLowerCase() === name.toLowerCase()
      );
    }
  };

  // Função para remover categoria do cache (quando excluir)
  const removeCategoryFromCache = (categoryId) => {
    const category = getCategoryById(categoryId);

    if (
      category &&
      (category.parentId === null || category.parentId === undefined)
    ) {
      // É categoria principal - remover ela e todas as subcategorias
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
      setCategoriesMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(categoryId);
        return newMap;
      });

      // Remover todas as subcategorias desta categoria
      const subsToRemove = getSubcategoriesByParent(categoryId);
      setSubcategories((prev) =>
        prev.filter((sub) => sub.parentId !== categoryId)
      );
      setSubcategoriesMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(categoryId);
        return newMap;
      });
    } else {
      // É subcategoria - remover apenas ela
      const subcategory = getSubcategoryById(categoryId);
      if (subcategory) {
        setSubcategories((prev) => prev.filter((sub) => sub.id !== categoryId));
        setSubcategoriesMap((prev) => {
          const newMap = new Map(prev);
          const parentSubs = newMap.get(subcategory.parentId) || [];
          newMap.set(
            subcategory.parentId,
            parentSubs.filter((sub) => sub.id !== categoryId)
          );
          return newMap;
        });
      }
    }
  };

  // Função para atualizar categoria no cache
  const updateCategoryInCache = (categoryId, updatedData) => {
    const isMainCategory = categoriesMap.has(categoryId);

    if (isMainCategory) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId ? { ...cat, ...updatedData } : cat
        )
      );
      setCategoriesMap((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(categoryId);
        newMap.set(categoryId, { ...current, ...updatedData });
        return newMap;
      });
    } else {
      // É subcategoria
      const subcategory = getSubcategoryById(categoryId);
      if (subcategory) {
        setSubcategories((prev) =>
          prev.map((sub) =>
            sub.id === categoryId ? { ...sub, ...updatedData } : sub
          )
        );

        setSubcategoriesMap((prev) => {
          const newMap = new Map(prev);
          const parentSubs = newMap.get(subcategory.parentId) || [];
          newMap.set(
            subcategory.parentId,
            parentSubs.map((sub) =>
              sub.id === categoryId ? { ...sub, ...updatedData } : sub
            )
          );
          return newMap;
        });
      }
    }
  };

  const contextValue = {
    // Estado
    categories,
    subcategories,
    isLoading,
    error,

    // Funções de busca (cache)
    getCategoryById,
    getCategoryByName,
    getSubcategoriesByParent,
    getSubcategoryById,
    getSubcategoryByName,

    // Funções de gerenciamento
    refreshCategories,
    addCategoryToCache,
    removeCategoryFromCache,
    updateCategoryInCache,
    categoryNameExists,

    // Informações do cache
    lastFetch,
    isCacheValid: lastFetch && Date.now() - lastFetch < CACHE_DURATION,
  };

  return (
    <CategoriesContext.Provider value={contextValue}>
      {children}
    </CategoriesContext.Provider>
  );
};

// Hook exportado separadamente para evitar problemas com Fast Refresh
function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within CategoriesProvider");
  }
  return context;
}

export { useCategories };
