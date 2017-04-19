/**
 *	Filtering Select nd Auto Sugguestion
 *
 */
import React from 'react'
import ReactDom from 'react-dom'
import DomScrollIntoView from 'dom-scroll-into-view'

return React.createClass({
	getDefaultProps() {
		return {
			onChange () {},
			onSelect (value, item) {},
			rendItem () { return true; },
			validate () { return true; }
		}
	},
	
	getInitialState() {
		return {
			value: this.props.initValue || '',
			isOpen: false,
			highlightedIndex: null,
			hasError: false
		}
	},
	
	componentWillMount () {
		this._ignoreBlur = false;
		this._autoCompletedOnKeyUp = false;
		this._performAutoCompletedOnUpdate = false;
	},
	
	componentWillReceiveProps () {
		this._performAutoCompletedOnUpdate = true;
	},
	
	componentDidUpdate(prevProps, prevState) {
		if(this.state.isOpen && this._performAutoCompletedOnUpdate) {
			this.maybeAutoCompleteText();
			this._performAutoCompletedOnUpdate = false;
		}
		
		this.maybeScrollItemIntoView();
	},
	
	maybeScrollItemIntoView () {
		if (this.state.isOpen === true && this.state.highlightedIndex !== null) {
			var itemNode = this.refs[`item-${this.state.highlightedIndex}`];
			var dropdownNode = this.refs.dropdown;
			DomScrollIntoView(itemNode, dropdownNode, { onlyScrollIfNeeded: true });
		}
	},
	
	render() {
		var dropDownListNode = this.state.isOpen ? 
			(<div className="dropdown encuta-box-shadow" ref="dropdown">{this.getDropDownListNode()}</div>) : null;
		var inputClass = "";
		if(this.state.hasError) inputClass = "error";
		
		return (<div className="filtering-select">
			<input className={inputClass}
				aria-autocomplete="both"
				onChange={(event) => this.handleChange(event)}
				onFocus={this.handleInputFocus}
				onBlur={this.handleInputBlur}
				onKeyDown= {(event) => this.handleKeyDown(event)}
				onKeyUp={(event) => this.handleKeyUp(event)}
				onClick={this.handleInputClick}
				value={this.state.value}
				ref="input"
			/><input tabindex="-1" value="&#9660;" 
				onClick={(event) => this.handleBtnClick(event)}
				style={{'margin': '0px', 'width': '25px', 'cursor': 'pointer'}} readOnly/>
			{dropDownListNode}
		</div>);
	},
	
	handleChange: function(event) {
		this._autoCompletedOnKeyUp = true;
		this.setState(
			{value: event.target.value}, 
			() => {this.props.onChange(event, this.state.value)});
	},
	
	handleKeyDown (event) {
		if (this.keyDownHandlers[event.key])
		  this.keyDownHandlers[event.key].call(this, event)
		else {
		  this.setState({
			highlightedIndex: null,
			isOpen: true
		  })
		}
	},
	
	handleKeyUp (event) {
		if(this._autoCompletedOnKeyUp) {
			this._autoCompletedOnKeyUp = false;
			this.maybeAutoCompleteText();
		}
	},
	
	handleInputClick(){
		if (this.state.isOpen === false) 
			this.setState({isOpen: true});
	},
	
	handleInputBlur () {				
		if(this._ignoreBlur) {
			return
		}
		var hasError = this.props.validate(this.state.value);
		this.setState({ hasError: hasError, isOpen:false, highlightedIndex:null});
	},
	
	handleInputFocus () {
		if(this._ignoreBlur) {
			return
		}
		this.setState({hasError:false, isOpen:true})
	},
			
	setIgnoreBlur(ignore) {
		this._ignoreBlur = ignore;
	},
	
	handleBtnClick: function(event) {
		this.setState({isOpen: !this.state.isOpen});
	},
	
	getDropDownListNode: function() {
		var list = this.getFilteredList();
		
		var itemNodes = list.map((item,index) => {
			var itemNode = this.props.rendItem(item, index === this.state.highlightedIndex);
			
			return React.cloneElement(itemNode, {
				onMouseDown: () => this.setIgnoreBlur(true),
				onMouseEnter: () => this.highlightItemFromMouse(index),
				onClick: () => this.selectItemFromMouse(item),
				ref: `item-${index}`,
			});
		});
		
		return itemNodes;
	},
	
	getFilteredList: function() {
		var items = this.props.items;
		if( this.props.itemFilter ){
			items = items.filter((item) => (
				this.props.itemFilter(item, this.state.value)
			));
		}
		return items;
	},
	
	selectItemFromMouse: function(item) {
		this.setState({
			value: this.props.getItemValue(item),
			isOpen: false,
			highlightedIndex: null
		}, () => {
				this.props.onSelect(this.state.value, item);
				this.refs.input.focus();
				this.setIgnoreBlur(false);
			})
	},
	
	highlightItemFromMouse: function(index) {
		this.setState({highlightedIndex: index});
	},
	
	keyDownHandlers: {
		ArrowDown(event) {
			event.preventDefault();
			this._autoCompletedOnKeyUp = true;
			var { highlightedIndex } = this.state;
			//compute next highlight index
			var nextHIndex = (
				highlightedIndex === null ||
				highlightedIndex === this.getFilteredList().length - 1
			)? 0: highlightedIndex + 1;
			//update state
			this.setState({highlightedIndex: nextHIndex, isOpen: true});
		},
		ArrowUp(event) {
			event.preventDefault();
			this._autoCompletedOnKeyUp = true;
			var { highlightedIndex } = this.state;
			var index = (
				highlightedIndex === null ||
				highlightedIndex === 0
			) ? this.getFilteredList().length - 1 : highlightedIndex - 1;
			this.setState({highlightedIndex: index, isOpen: true});
		},
		Enter(event) {
			if (this.state.isOpen === false) {
				// menu is closed so there is no selection to accept -> do nothing
				return;
			}
			if( this.state.highlightedIndex === null ) {
				this.setState({
					isOpen: false
				}, () => {this.refs.input.select()});
			} else {
				var item = this.getFilteredList()[this.state.highlightedIndex];
				this.setState({
					value: this.props.getItemValue(item),
					isOpen: false,
					highlightedIndex: null
				}, () => {
					this.refs.input.setSelectionRange(this.state.value.lenth, this.state.value.length);
					this.props.onSelect(this.state.value, item)
				});
			}
		},
		Escape (event) {
		  this.setState({
			highlightedIndex: null,
			isOpen: false
		  })
		}
	},
	
	maybeAutoCompleteText() {
		if (this.state.value === '')
			return ;
		var items = this.getFilteredList();
		var highlightedIndex = this.state.highlightedIndex;
		var matchedItem = highlightedIndex !== null? items[highlightedIndex] : items[0];
		var matchedValue = this.props.getItemValue(matchedItem);
		var ifMatch = matchedValue === null ? false : (matchedValue.toLowerCase().indexOf(this.state.value.toLowerCase()) === 0 );
		if(ifMatch) {
			var inputNode = this.refs.input;
			var completeInputText = () => {
				inputNode.value = matchedValue;
				inputNode.setSelectionRange(this.state.value.length, matchedValue.length);
			}
			
			if(highlightedIndex === null) {
				this.setState({highlightedIndex: 0}, completeInputText);
			} else {
				completeInputText();
			}
		}
	},
	
	reset () {
		this.refs.input.select();
	}
	
});
