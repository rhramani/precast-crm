import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetWallTemplatesQuery,
  useCreateWallTemplateMutation,
  useUpdateWallTemplateMutation,
  useDeleteWallTemplateMutation,
  useSetDefaultWallTemplateMutation,
} from '../../store/api/wallTemplateApi';
import { useGetProductsQuery, useGetProductCategoriesQuery } from '../../store/api/productApi';
import { useGetRawMaterialsQuery } from '../../store/api/rawMaterialApi';
import { selectCurrentRole } from '../../store/slices/authSlice';
import FormDrawer from '../../components/ui/FormDrawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import './WallTemplatePage.css';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// A rotating palette that complements the navy primary theme
const COLOR_PALETTE = [
  '#182650', '#2563EB', '#7C3AED', '#DB2777',
  '#D97706', '#16A34A', '#0891B2', '#DC2626',
  '#7C3AED', '#475569',
];

const prettifyCategory = (cat) =>
  cat ? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

const getCategoryColor = (cat, allCategories) => {
  const idx = allCategories.indexOf(cat);
  return COLOR_PALETTE[(idx >= 0 ? idx : 0) % COLOR_PALETTE.length];
};

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  baySpacingMeters: 3,
  products: [],
  installationMaterials: [],
  isDefault: false,
  isActive: true,
};

const EMPTY_PRODUCT_LINE = { productId: '', qtyPerBay: 1, unit: 'pcs', note: '' };
const EMPTY_MATERIAL_LINE = { materialId: '', qty: 1, type: 'per_meter', note: '' };

// ─────────────────────────────────────────────
// Icons (inline SVG — no extra dep)
// ─────────────────────────────────────────────
const IconBricks = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="4" rx="1"/><rect x="2" y="13" width="20" height="4" rx="1"/>
    <line x1="7" y1="7" x2="7" y2="11"/><line x1="12" y1="7" x2="12" y2="11"/>
    <line x1="17" y1="7" x2="17" y2="11"/><line x1="5" y1="13" x2="5" y2="17"/>
    <line x1="12" y1="13" x2="12" y2="17"/><line x1="19" y1="13" x2="19" y2="17"/>
  </svg>
);
const IconRuler = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 16.5L16.5 3l4.5 4.5L7.5 21 3 16.5z"/>
    <line x1="8" y1="12" x2="10" y2="10"/><line x1="11" y1="15" x2="13" y2="13"/>
    <line x1="14" y1="9" x2="16" y2="7"/>
  </svg>
);
const IconPackage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10V6a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 6v4"/><path d="M12 22V12"/>
    <path d="M3.27 6.96 12 12.01l8.73-5.05"/><polyline points="21 10 12 15 3 10"/>
  </svg>
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const WallTemplatePage = () => {
  useSelector(selectCurrentRole); // keep auth scope

  const [categoryFilter, setCategoryFilter] = useState('');

  // ── Queries ──────────────────────────────────
  const { data: templatesRes, isLoading } = useGetWallTemplatesQuery(
    categoryFilter ? { category: categoryFilter } : {}
  );
  const { data: productsRes } = useGetProductsQuery({ limit: 200 });
  const { data: categoriesRes } = useGetProductCategoriesQuery();
  const { data: rawMaterialsRes } = useGetRawMaterialsQuery({ limit: 200 });
 
  const templates       = templatesRes?.data?.templates  || [];
  const allProducts     = productsRes?.data?.products    || [];
  const productCategories = categoriesRes?.data?.categories || [];
  const rawMaterials    = rawMaterialsRes?.data?.materials || [];

  // ── Mutations ─────────────────────────────────
  const [createTemplate] = useCreateWallTemplateMutation();
  const [updateTemplate] = useUpdateWallTemplateMutation();
  const [deleteTemplate] = useDeleteWallTemplateMutation();
  const [setDefault]     = useSetDefaultWallTemplateMutation();

  // ── Drawer / Form State ───────────────────────
  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form,             setForm]             = useState(EMPTY_FORM);
  const [validationErrors, setValidationErrors] = useState({});
  const [saveLoading,      setSaveLoading]      = useState(false);
  const [confirmDialog,    setConfirmDialog]    = useState({ isOpen: false, id: null });

  // ── Handlers ─────────────────────────────────

  const handleOpenAdd = () => {
    setSelectedTemplate(null);
    setForm({ ...EMPTY_FORM, category: productCategories[0] || '' });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (tmpl) => {
    setSelectedTemplate(tmpl);
    setForm({
      name:             tmpl.name            || '',
      category:         tmpl.category        || '',
      description:      tmpl.description     || '',
      baySpacingMeters: tmpl.baySpacingMeters ?? 3,
      products: (tmpl.products || []).map((line) => ({
        productId: line.productId?._id || line.productId || '',
        qtyPerBay: line.qtyPerBay ?? 1,
        unit:      line.unit      || 'pcs',
        note:      line.note      || '',
      })),
      installationMaterials: (tmpl.installationMaterials || []).map((line) => ({
        materialId: line.materialId?._id || line.materialId || '',
        qty:        line.qty        ?? 1,
        type:       'per_meter',
        note:       line.note       || '',
      })),
      isDefault: tmpl.isDefault ?? false,
      isActive:  tmpl.isActive  ?? true,
    });
    setValidationErrors({});
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!form.name.trim())  errors.name     = 'Template name is required';
    if (!form.category)     errors.category = 'Please select a wall category';
    if (form.products.length === 0)
      errors.products = 'Add at least one product line';

    form.products.forEach((line, i) => {
      if (!line.productId)
        errors[`product_${i}_id`]  = 'Select a product';
      if (!line.qtyPerBay || Number(line.qtyPerBay) <= 0)
        errors[`product_${i}_qty`] = 'Qty must be > 0';
    });

    form.installationMaterials.forEach((line, i) => {
      if (!line.materialId)
        errors[`material_${i}_id`] = 'Select raw material';
      if (!line.qty || Number(line.qty) < 0)
        errors[`material_${i}_qty`] = 'Qty must be >= 0';
    });

    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    setSaveLoading(true);
    try {
      if (selectedTemplate) {
        await updateTemplate({ id: selectedTemplate._id, ...form }).unwrap();
      } else {
        await createTemplate(form).unwrap();
      }
      setDrawerOpen(false);
    } catch (err) {
      setValidationErrors({ general: err?.data?.message || 'Save failed. Please try again.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    try { await setDefault(id).unwrap(); }
    catch (err) { alert(err?.data?.message || 'Could not set as default'); }
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    if (!id) return;
    try {
      await deleteTemplate(id).unwrap();
      setConfirmDialog({ isOpen: false, id: null });
    } catch (err) { alert(err?.data?.message || 'Failed to delete'); }
  };

  // ── Product Line Helpers ──────────────────────

  const handleAddProductLine = () =>
    setForm((prev) => ({ ...prev, products: [...prev.products, { ...EMPTY_PRODUCT_LINE }] }));

  const handleProductLineChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.products];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'productId' && value) {
        const prod = allProducts.find((p) => p._id === value);
        if (prod) updated[index].unit = prod.unit || 'pcs';
      }
      return { ...prev, products: updated };
    });
  };

  const handleRemoveProductLine = (index) =>
    setForm((prev) => ({ ...prev, products: prev.products.filter((_, i) => i !== index) }));

  const handleAddMaterialLine = () =>
    setForm((prev) => ({ ...prev, installationMaterials: [...prev.installationMaterials, { ...EMPTY_MATERIAL_LINE }] }));

  const handleMaterialLineChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.installationMaterials];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, installationMaterials: updated };
    });
  };

  const handleRemoveMaterialLine = (index) =>
    setForm((prev) => ({ ...prev, installationMaterials: prev.installationMaterials.filter((_, i) => i !== index) }));

  // ── Group templates by category ───────────────

  const groupedTemplates = templates.reduce((acc, tmpl) => {
    const cat = tmpl.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tmpl);
    return acc;
  }, {});

  // ── Render ────────────────────────────────────
  return (
    <div className="wtp-page">

      {/* ── Page Header ────────────────────────── */}
      <div className="wtp-header">
        <div className="wtp-header__left">
          <div className="wtp-header__icon-wrap">
            <IconBricks />
          </div>
          <div>
            <h1 className="wtp-header__title">Wall Category Templates</h1>
            <p className="wtp-header__subtitle">
              Define which products and how many pieces are needed per bay for each wall type.
              Used automatically by the Site Requirement Calculator.
            </p>
          </div>
        </div>
        <button className="btn btn--primary" onClick={handleOpenAdd}>
          + New Template
        </button>
      </div>

      {/* ── Category Filter Bar ────────────────── */}
      <div className="wtp-filter-bar">
        <span className="wtp-filter-bar__label">Filter:</span>
        <button
          className={`wtp-pill ${categoryFilter === '' ? 'wtp-pill--active' : ''}`}
          onClick={() => setCategoryFilter('')}
        >
          All Categories
        </button>
        {productCategories.map((cat) => (
          <button
            key={cat}
            className={`wtp-pill ${categoryFilter === cat ? 'wtp-pill--active' : ''}`}
            onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
          >
            {prettifyCategory(cat)}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────── */}
      {isLoading ? (
        <div className="wtp-loading">
          <div className="wtp-spinner" />
          <span>Loading templates...</span>
        </div>

      ) : templates.length === 0 ? (
        <div className="wtp-empty">
          <div className="wtp-empty__icon"><IconBricks /></div>
          <h3>No Templates Yet</h3>
          <p>Create your first wall category template to define product requirements per bay.</p>
          <button className="btn btn--primary" style={{ marginTop: '4px' }} onClick={handleOpenAdd}>
            + Create First Template
          </button>
        </div>

      ) : (
        <div className="wtp-groups">
          {Object.entries(groupedTemplates).map(([cat, catTemplates]) => {
            const color = getCategoryColor(cat, productCategories);
            return (
              <div key={cat}>
                {/* Group Header */}
                <div className="wtp-group__header">
                  <span className="wtp-group__dot" style={{ background: color }} />
                  <h2 className="wtp-group__title">{prettifyCategory(cat)}</h2>
                  <span className="wtp-group__count">
                    {catTemplates.length} template{catTemplates.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Cards */}
                <div className="wtp-cards">
                  {catTemplates.map((tmpl) => (
                    <div
                      key={tmpl._id}
                      className={`wtp-card${tmpl.isDefault ? ' wtp-card--default' : ''}${!tmpl.isActive ? ' wtp-card--inactive' : ''}`}
                    >
                      {/* Colour stripe */}
                      <div className="wtp-card__stripe" style={{ background: color }} />

                      <div className="wtp-card__body">
                        {/* Top row — badges + actions */}
                        <div className="wtp-card__top">
                          <div className="wtp-card__badges">
                            <span
                              className="wtp-card__cat-badge"
                              style={{
                                background: color + '18',
                                color,
                                borderColor: color + '30',
                              }}
                            >
                              {prettifyCategory(cat)}
                            </span>
                            {tmpl.isDefault && (
                              <span className="wtp-card__default-badge">
                                ★ Default
                              </span>
                            )}
                            {!tmpl.isActive && (
                              <span className="wtp-card__inactive-badge">Inactive</span>
                            )}
                          </div>
                          <ActionsDropdown
                            actions={[
                              { label: 'Edit Template',  onClick: () => handleOpenEdit(tmpl),                                             type: 'primary' },
                              !tmpl.isDefault && { label: 'Set as Default', onClick: () => handleSetDefault(tmpl._id),                    type: 'info' },
                              { divider: true },
                              { label: 'Delete',         onClick: () => setConfirmDialog({ isOpen: true, id: tmpl._id }),                 type: 'danger' },
                            ].filter(Boolean)}
                          />
                        </div>

                        {/* Name */}
                        <h3 className="wtp-card__name">{tmpl.name}</h3>

                        {/* Description */}
                        {tmpl.description && (
                          <p className="wtp-card__desc">{tmpl.description}</p>
                        )}

                        {/* Bay Spacing row */}
                        <div className="wtp-card__bay-row">
                          <span className="wtp-card__bay-label">
                            <IconRuler />
                            Bay Spacing
                          </span>
                          <span className="wtp-card__bay-value">
                            {tmpl.baySpacingMeters}m per bay
                          </span>
                        </div>

                        {/* Products table */}
                        <div className="wtp-card__product-section">
                          <div className="wtp-card__product-header">
                            <span>Products Required</span>
                            <span className="wtp-card__product-count">
                              {tmpl.products?.length || 0} items
                            </span>
                          </div>
                          {tmpl.products && tmpl.products.length > 0 ? (
                            <table className="wtp-product-table">
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th style={{ textAlign: 'right' }}>Qty / Bay</th>
                                  <th>Unit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tmpl.products.map((line, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <span className="wtp-prod-name">
                                        {line.productId?.productName || '—'}
                                      </span>
                                      <span className="wtp-prod-code">
                                        {line.productId?.productCode}
                                      </span>
                                    </td>
                                    <td className="wtp-prod-qty">{line.qtyPerBay}</td>
                                    <td className="wtp-prod-unit">{line.unit}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="wtp-card__no-products">No products configured</div>
                          )}
                        </div>

                        {/* Installation Raw Materials table */}
                        <div className="wtp-card__product-section" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '12px', marginTop: '12px' }}>
                          <div className="wtp-card__product-header">
                            <span>Installation Materials</span>
                            <span className="wtp-card__product-count" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                              {tmpl.installationMaterials?.length || 0} items
                            </span>
                          </div>
                          {tmpl.installationMaterials && tmpl.installationMaterials.length > 0 ? (
                            <table className="wtp-product-table">
                              <thead>
                                <tr>
                                  <th>Raw Material</th>
                                  <th style={{ textAlign: 'right' }}>Qty / Meter</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tmpl.installationMaterials.map((line, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <span className="wtp-prod-name">
                                        {line.materialId?.materialName || '—'}
                                      </span>
                                      <span className="wtp-prod-code">
                                        {line.materialId?.materialCode}
                                      </span>
                                    </td>
                                    <td className="wtp-prod-qty" style={{ textAlign: 'right' }}>
                                      {line.qty} {line.materialId?.unit || ''}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="wtp-card__no-products">No installation materials configured</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Drawer ───────────────── */}
      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedTemplate ? 'Edit Wall Template' : 'Create Wall Template'}
        footer={
          <>
            <button onClick={() => setDrawerOpen(false)} className="btn btn--secondary">
              Cancel
            </button>
            <button onClick={handleSubmit} className="btn btn--primary" disabled={saveLoading}>
              {saveLoading ? 'Saving...' : 'Save Template'}
            </button>
          </>
        }
      >
        {validationErrors.general && (
          <div className="wtp-error-banner">{validationErrors.general}</div>
        )}

        {/* Template Name */}
        <div className="field-group">
          <label className="field-label field-label--required">Template Name</label>
          <input
            type="text"
            className="field-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Standard Compound Wall 8ft"
          />
          {validationErrors.name && <span className="field-error">{validationErrors.name}</span>}
        </div>

        <div className="form-row">
          {/* Category — dynamic from Product Master */}
          <div className="field-group">
            <label className="field-label field-label--required">Wall Category</label>
            <select
              className="field-select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select Category...</option>
              {productCategories.map((cat) => (
                <option key={cat} value={cat}>{prettifyCategory(cat)}</option>
              ))}
            </select>
            {validationErrors.category && (
              <span className="field-error">{validationErrors.category}</span>
            )}
          </div>

          {/* Bay Spacing */}
          <div className="field-group">
            <label className="field-label field-label--required">Bay Spacing (meters)</label>
            <input
              type="number"
              className="field-input"
              value={form.baySpacingMeters}
              min="0.1"
              step="0.5"
              onChange={(e) => setForm({ ...form, baySpacingMeters: Number(e.target.value) })}
            />
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'block' }}>
              Every {form.baySpacingMeters}m of wall = 1 bay unit
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="field-group">
          <label className="field-label">Description</label>
          <textarea
            className="field-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional notes about this template..."
            rows={2}
          />
        </div>

        {/* Flags */}
        <div className="form-row">
          <label className="wtp-checkbox">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Set as default for this category
          </label>
          <label className="wtp-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Template is active
          </label>
        </div>

        {/* ── Product Lines ────────────────────── */}
        <div className="wtp-product-lines">
          <div className="wtp-product-lines__header">
            <div>
              <p className="wtp-product-lines__title">Products Required Per Bay</p>
              <p className="wtp-product-lines__subtitle">
                Specify how many pieces of each product are needed per bay unit.
              </p>
            </div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleAddProductLine}>
              + Add Product
            </button>
          </div>

          {validationErrors.products && (
            <div style={{ padding: '8px 16px' }}>
              <span className="field-error">{validationErrors.products}</span>
            </div>
          )}

          {form.products.length === 0 ? (
            <div className="wtp-product-lines__empty">
              <IconPackage />
              <p>No products added yet. Click "+ Add Product" to configure.</p>
            </div>
          ) : (
            <div className="wtp-product-lines__list">
              {/* Column headers */}
              <div className="wtp-line-header">
                <span style={{ flex: 2 }}>Product</span>
                <span style={{ flex: '0 0 80px' }}>Qty/Bay</span>
                <span style={{ flex: '0 0 70px' }}>Unit</span>
                <span style={{ width: '32px' }} />
              </div>

              {form.products.map((line, idx) => (
                <div key={idx} className="wtp-line-row">
                  {/* Product select */}
                  <div style={{ flex: 2 }}>
                    <select
                      className={`field-select${validationErrors[`product_${idx}_id`] ? ' field-select--error' : ''}`}
                      value={line.productId}
                      onChange={(e) => handleProductLineChange(idx, 'productId', e.target.value)}
                    >
                      <option value="">Select product...</option>
                      {allProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          [{p.productCode}] {p.productName}
                        </option>
                      ))}
                    </select>
                    {validationErrors[`product_${idx}_id`] && (
                      <span className="field-error">{validationErrors[`product_${idx}_id`]}</span>
                    )}
                  </div>

                  {/* Qty */}
                  <div style={{ flex: '0 0 80px' }}>
                    <input
                      type="number"
                      className={`field-input${validationErrors[`product_${idx}_qty`] ? ' field-input--error' : ''}`}
                      value={line.qtyPerBay}
                      min="0.001"
                      step="1"
                      onChange={(e) => handleProductLineChange(idx, 'qtyPerBay', Number(e.target.value))}
                    />
                    {validationErrors[`product_${idx}_qty`] && (
                      <span className="field-error">{validationErrors[`product_${idx}_qty`]}</span>
                    )}
                  </div>

                  {/* Unit */}
                  <div style={{ flex: '0 0 70px' }}>
                    <input
                      type="text"
                      className="field-input"
                      value={line.unit}
                      onChange={(e) => handleProductLineChange(idx, 'unit', e.target.value)}
                      placeholder="pcs"
                    />
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    className="wtp-line-remove"
                    onClick={() => handleRemoveProductLine(idx)}
                    title="Remove this product line"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Installation Materials Configuration ── */}
        <div className="wtp-product-lines" style={{ marginTop: '24px' }}>
          <div className="wtp-product-lines__header">
            <div>
              <p className="wtp-product-lines__title">Site Installation Raw Materials Required</p>
              <p className="wtp-product-lines__subtitle">
                Select raw materials and quantities needed at client site per meter.
              </p>
            </div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleAddMaterialLine}>
              + Add Raw Material
            </button>
          </div>

          {form.installationMaterials.length === 0 ? (
             <div className="wtp-product-lines__empty">
               <IconPackage />
               <p>No installation raw materials configured. Click "+ Add Raw Material" to setup.</p>
             </div>
          ) : (
            <div className="wtp-product-lines__list">
              {/* Column headers */}
              <div className="wtp-line-header">
                <span style={{ flex: 2 }}>Raw Material</span>
                <span style={{ flex: '0 0 80px' }}>Qty / Meter</span>
                <span style={{ flex: '0 0 70px' }}>Unit</span>
                <span style={{ width: '32px' }} />
              </div>

              {form.installationMaterials.map((line, idx) => {
                const selectedMat = rawMaterials.find((m) => m._id === line.materialId);
                return (
                  <div key={idx} className="wtp-line-row" style={{ alignItems: 'flex-start' }}>
                    {/* Material select */}
                    <div style={{ flex: 2 }}>
                      <select
                        className={`field-select${validationErrors[`material_${idx}_id`] ? ' field-select--error' : ''}`}
                        value={line.materialId}
                        onChange={(e) => handleMaterialLineChange(idx, 'materialId', e.target.value)}
                      >
                        <option value="">Select raw material...</option>
                        {rawMaterials.map((m) => (
                          <option key={m._id} value={m._id}>
                            [{m.materialCode}] {m.materialName} ({m.category})
                          </option>
                        ))}
                      </select>
                      {validationErrors[`material_${idx}_id`] && (
                        <span className="field-error">{validationErrors[`material_${idx}_id`]}</span>
                      )}
                    </div>

                    {/* Qty */}
                    <div style={{ flex: '0 0 80px' }}>
                      <input
                        type="number"
                        className={`field-input${validationErrors[`material_${idx}_qty`] ? ' field-input--error' : ''}`}
                        step="0.01"
                        min="0"
                        value={line.qty}
                        onChange={(e) => handleMaterialLineChange(idx, 'qty', Number(e.target.value))}
                      />
                      {validationErrors[`material_${idx}_qty`] && (
                        <span className="field-error">{validationErrors[`material_${idx}_qty`]}</span>
                      )}
                    </div>

                    {/* Unit */}
                    <div style={{ flex: '0 0 70px', alignSelf: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', paddingLeft: '8px' }}>
                      {selectedMat?.unit || '—'}
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      className="wtp-line-remove"
                      onClick={() => handleRemoveMaterialLine(idx)}
                      title="Remove this raw material line"
                      style={{ alignSelf: 'center' }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FormDrawer>

      {/* ── Confirm Delete ────────────────────── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Template"
        message="Are you sure you want to delete this wall category template? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default WallTemplatePage;
