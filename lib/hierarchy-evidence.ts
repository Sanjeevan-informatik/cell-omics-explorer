import type {DataTemplate} from './data-catalog';
export const EVIDENCE_COLUMNS=['participant_id','sample_id','molecule','feature_id','measurement','value','unit','details','evidence'];
// Values and identifiers below are deliberately synthetic; no cross-assay inference.
const examples:Record<string,string[][]>={
 'dna-features':[['promoter_demo','annotation','1','feature','demo-dna:20–40; 1-based inclusive; promoter annotation'],['variant_demo','alternate_fraction','0.25','fraction','demo-dna:42; reference C; alternative T; synthetic variant']],
 epigenome:[['CpG_demo','5mC_beta','0.72','fraction','Synthetic methylation at demo-dna:24'],['peak_demo','ATAC_signal','32','arbitrary_units','Synthetic accessible interval demo-dna:20–40'],['histone_demo','H3K27ac_signal','18','arbitrary_units','Synthetic histone-mark interval demo-dna:41–60']],
 'gene-regulation':[['TF_demo→GENE_demo','edge_weight','0.8','teaching_score','Illustrative directed regulatory edge; no causal inference'],['enhancer_demo→promoter_demo','link_score','0.6','teaching_score','Synthetic regulatory link; not inferred from Hi-C']],
 'single-cell':[['T01:GENE_A','expression','12','counts','Synthetic cell T01 feature GENE_A'],['T01:GENE_B','expression','4','counts','Synthetic cell T01 feature GENE_B']],
 spatial:[['spot_01','GENE_A_expression','8','counts','Synthetic tissue spot; x=10,y=20 µm; no microscopy image supplied'],['spot_02','GENE_A_expression','20','counts','Synthetic tissue spot; x=30,y=40 µm; no microscopy image supplied']],
 imaging:[['object_01','segmented_area','55','square_micrometers','Synthetic segmented cell object; no image pixels supplied'],['object_02','segmented_area','72','square_micrometers','Synthetic segmented cell object; no image pixels supplied']],
 pathways:[['NODE_A→NODE_B','edge_weight','1','teaching_score','Synthetic directed pathway edge, not an experimentally established interaction'],['NODE_B→NODE_C','edge_weight','0.5','teaching_score','Synthetic directed pathway edge']],
 immunomics:[['clone_demo_A','clonotype_count','8','counts','Synthetic TRB CDR3: CASSLGQETQYF; antigen specificity unknown'],['clone_demo_B','clonotype_count','3','counts','Synthetic TRB CDR3: CASSIRSSYEQYF; antigen specificity unknown']],
 evolution:[['ancestor→clone_A','branch_length','2','synthetic_events','Teaching lineage edge; tree was supplied, not inferred'],['ancestor→clone_B','branch_length','3','synthetic_events','Teaching lineage edge; no mutation timing inference']],
 rna:[['GENE_A','expression','120','counts','Synthetic RNA count'],['GENE_B','expression','45','counts','Synthetic RNA count']],
 protein:[['PROTEIN_A','abundance','12','arbitrary_units','Synthetic protein abundance'],['PROTEIN_B','abundance','6','arbitrary_units','Synthetic protein abundance']],
 'peptide-ms':[['fragment_1','intensity','100','arbitrary_units','Synthetic peak at m/z 147.1; no peptide identification inferred'],['fragment_2','intensity','60','arbitrary_units','Synthetic peak at m/z 260.2']],
 metabolite:[['metabolite_feature_1','intensity','90','arbitrary_units','Synthetic m/z 181.07, RT 2.1 min; identity unassigned'],['metabolite_feature_2','intensity','35','arbitrary_units','Synthetic m/z 89.02, RT 1.4 min; identity unassigned']],
 lipid:[['PC_34:1','abundance','24','arbitrary_units','Sum composition annotation only; acyl positions unresolved']],
 glycan:[['Hex5HexNAc2','abundance','17','arbitrary_units','Composition only; branching and linkage unresolved']],
};
const specimens=[['SYN001','blood_bulk'],['SYN001','blood_T01'],['SYN002','liver_bulk']];
const records:string[][]=[];
for(const [p,s] of specimens)for(const [layer,items] of Object.entries(examples)){
 // Do not attach single-cell, spatial or receptor observations to incompatible specimens.
 if(layer==='single-cell'&&s!=='blood_T01')continue;
 if(layer==='spatial'&&s!=='liver_bulk')continue;
 if(layer==='immunomics'&&s==='liver_bulk')continue;
 for(const row of items)records.push([p,s,layer,...row,'synthetic teaching observation']);
}
export const HIERARCHY_EVIDENCE:DataTemplate={id:'hierarchy-evidence',category:'multiomics',title:'Linked hierarchy observations',filename:'hierarchy_evidence.tsv',description:'Participant-linked annotations, assay values, spatial metadata and network edges across 15 layers. Synthetic teaching data.',units:'Explicit unit per observation; do not combine unlike measurements',content:EVIDENCE_COLUMNS.join('\t')+'\n'+records.map(r=>r.join('\t')).join('\n')+'\n'};
export const EVIDENCE_ONLY_LAYERS=['dna-features','epigenome','gene-regulation','single-cell','spatial','imaging','pathways','immunomics','evolution'];
